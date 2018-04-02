import { collect } from 'bluestream'
import redisLoader from '../src/index'
import { redis, cleanup, redisUrl, keyPrefix } from './helper'

describe('Redis - Loader', async () => {
  beforeEach(async () => {
    await cleanup()
    redis.resetStats()
  })

  it('can batch commands to Redis', async () => {
    await Promise.join(
      redis.ping(),
      redis.dbsize(),
      redis.time()
    )
    const { tripCountTotal, commandCount, commandCountTotal, timeInRedis, timeInRedisTotal } = redis.stats
    expect(commandCount).toEqual(3)
    expect(commandCountTotal).toEqual(3)
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
    const { tripCountTotal, commandCount, commandCountTotal, timeInRedis, timeInRedisTotal } = redis.stats
    expect(commandCount).toEqual(undefined)
    expect(commandCountTotal).toEqual(0)
    expect(tripCountTotal).toEqual(0)
    expect(timeInRedis).toEqual(undefined)
    expect(timeInRedisTotal).toEqual(0)
  })

  describe('Logging', async () => {
    it('logs data when commands are batched', async () => {
      function logger (_, { tripCountTotal, commandCount, commandCountTotal, timeInRedis, timeInRedisTotal }) {
        expect(commandCount).toEqual(3)
        expect(commandCountTotal).toEqual(3)
        expect(tripCountTotal).toEqual(1)
        expect(timeInRedis).toBeGreaterThanOrEqual(0)
        expect(timeInRedisTotal).toBeGreaterThanOrEqual(0)
      }
      const redis = redisLoader(redisUrl, { keyPrefix, logger })
      await Promise.join(
        redis.ping(),
        redis.dbsize(),
        redis.time()
      )
    })
    it('logs errors in the loader', async () => {
      function logger (err) {
        expect(err).toBeInstanceOf(Error)
      }
      const redis = redisLoader(redisUrl, { keyPrefix, logger })
      try {
        await redis.zadd('foo')
      } catch (e) {}
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
    it('can recieve messages', async () => {
      await new Promise(async resolve => {
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
