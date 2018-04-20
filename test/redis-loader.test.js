import { collect } from 'bluestream'
import redisLoader from '../src/index'

export const keyPrefix = '_test_'
export const redisUrl = 'redis://localhost:6379/8'
export const redis = redisLoader(redisUrl, { keyPrefix })

describe('Redis - Loader', async () => {
  beforeEach(async () => {
    await redis.flushdb()
    redis.resetStats()
  })

  it('can batch commands to Redis', async () => {
    await Promise.join(
      redis.ping(),
      redis.dbsize(),
      redis.time()
    )
    const { tripCountTotal, commands, responseCount, responseCountTotal, timeInRedis, timeInRedisTotal } = redis.stats
    expect(commands).toEqual([['ping'], ['dbsize'], ['time']])
    expect(responseCount).toEqual(3)
    expect(responseCountTotal).toEqual(3)
    expect(tripCountTotal).toEqual(1)
    expect(timeInRedis).toBeGreaterThanOrEqual(0)
    expect(timeInRedisTotal).toBeGreaterThanOrEqual(0)
  })

  it('can reset batch command counts', async () => {
    await Promise.join(
      redis.ping(),
      redis.dbsize(),
      redis.time()
    )
    redis.resetStats()
    const { tripCountTotal, commands, responseCount, responseCountTotal, timeInRedis, timeInRedisTotal } = redis.stats
    expect(commands).toEqual(null)
    expect(responseCount).toEqual(0)
    expect(responseCountTotal).toEqual(0)
    expect(tripCountTotal).toEqual(0)
    expect(timeInRedis).toEqual(0)
    expect(timeInRedisTotal).toEqual(0)
  })

  describe('Logging', async () => {
    it('logs data when commands are batched', async () => {
      return new Promise(async resolve => {
        function logger (_, { tripCountTotal, commands, responseCount, responseCountTotal, timeInRedis, timeInRedisTotal }) {
          expect(commands).toEqual([['ping'], ['dbsize'], ['time']])
          expect(responseCount).toEqual(3)
          expect(responseCountTotal).toEqual(3)
          expect(tripCountTotal).toEqual(1)
          expect(timeInRedis).toBeGreaterThanOrEqual(0)
          expect(timeInRedisTotal).toBeGreaterThanOrEqual(0)
          resolve()
        }
        const redis = redisLoader(redisUrl, { keyPrefix, logger })
        await Promise.join(
          redis.ping(),
          redis.dbsize(),
          redis.time()
        )
      })
    })
    it('logs errors and stats in the loader', async () => {
      return new Promise(async (resolve, reject) => {
        function logger (err, { tripCountTotal, commands, responseCount, responseCountTotal, timeInRedis, timeInRedisTotal }) {
          expect(err).toBeInstanceOf(Error)
          expect(commands).toEqual([[ 'zadd', 'foo' ]])
          expect(responseCount).toEqual(1)
          expect(responseCountTotal).toEqual(1)
          expect(tripCountTotal).toEqual(1)
          expect(timeInRedis).toBeGreaterThanOrEqual(0)
          expect(timeInRedisTotal).toBeGreaterThanOrEqual(0)
          resolve()
        }
        const redis = redisLoader(redisUrl, { keyPrefix, logger })
        try {
          await expect(redis.zadd('foo')).rejects.toThrow('err')
        } catch (e) {
          reject(e)
        }
      })
    })
  })

  describe('Buffers', async () => {
    it('can batch buffer commands to redis', async () => {
      const results = await Promise.join(
        redis.pingBuffer(),
        redis.pingBuffer(),
        redis.pingBuffer()
      )
      results.forEach(result => {
        expect(result).toBeInstanceOf(Buffer)
        expect(result.toString()).toEqual('PONG')
      })
    })
  })

  describe('Streams', async () => {
    it('can handle streams', async () => {
      await Promise.join(
        redis.zadd('foo', 0, 'abc'),
        redis.zadd('foo', 0, 'def'),
        redis.zadd('foo', 0, 'ghi')
      )
      redis.resetStats()
      expect(await collect(redis.zscanStream('foo'))).toEqual([[ 'abc', '0', 'def', '0', 'ghi', '0' ]])
      const { tripCountTotal } = redis.stats
      expect(tripCountTotal).toEqual(1)
    })
  })

  describe('PubSub', async () => {
    it('can recieve messages', () => {
      return new Promise(async resolve => {
        redis.on('message', (channel, message) => {
          expect(channel).toEqual('foo')
          expect(message).toEqual('bar')
          resolve()
        })

        expect(await redis.subscribe('foo')).toEqual(1)
        const pub = redisLoader(redisUrl, { keyPrefix })
        await pub.publish('foo', 'bar')
      })
    })
  })
})
