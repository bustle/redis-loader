import * as bluebird from 'bluebird'
import { collect } from 'bluestream'
import redisLoader from '../src/index'

export const keyPrefix = '_test_'
export const redisUrl = 'redis://localhost:6379/8'
export const redis = redisLoader(redisUrl, { keyPrefix })

describe('Redis - Loader', () => {
  beforeEach(async () => {
    await redis.flushdb()
    redis.resetStats()
  })

  it('can batch commands to Redis', async () => {
    await bluebird.join(
      redis.ping(),
      redis.dbsize(),
      redis.time()
    )
    const { batchCount, lastBatch, commandCount, responseCount, timeInRedis } = redis.stats
    expect(lastBatch.commands).toEqual([['ping'], ['dbsize'], ['time']])
    expect(lastBatch.commandCount).toEqual(3)
    expect(lastBatch.responseCount).toEqual(3)
    expect(lastBatch.timeInRedis).toBeGreaterThanOrEqual(0)
    expect(commandCount).toEqual(3)
    expect(responseCount).toEqual(3)
    expect(batchCount).toEqual(1)
    expect(timeInRedis).toBeGreaterThanOrEqual(0)
  })

  it('can reset batch command counts', async () => {
    await bluebird.join(
      redis.ping(),
      redis.dbsize(),
      redis.time()
    )
    redis.resetStats()
    const { batchCount, lastBatch, commandCount, responseCount, timeInRedis, batches } = redis.stats
    expect(batchCount).toEqual(0)
    expect(lastBatch).toEqual(null)
    expect(commandCount).toEqual(0)
    expect(responseCount).toEqual(0)
    expect(timeInRedis).toEqual(0)
    expect(batches.size).toEqual(0)
  })

  describe('Logging', () => {
    it('logs data when commands are batched', done => {
      let callCount = 0;
      function logger (stats) {
        const { batchCount, lastBatch, commandCount, responseCount, timeInRedis, batches } = stats
        callCount++
        try {
          expect(callCount).toEqual(1)
          expect(batchCount).toEqual(1)
          expect(lastBatch.commands).toEqual([['ping'], ['ping'], ['ping']])
          expect(lastBatch.response).toEqual([[null, "PONG"], [null, "PONG"], [null, "PONG"]])
          expect(lastBatch.responseCount).toEqual(3)
          expect(responseCount).toEqual(3)
          expect(lastBatch.commandCount).toEqual(3)
          expect(commandCount).toEqual(3)
          expect(lastBatch.timeInRedis).toBeGreaterThanOrEqual(0)
          expect(timeInRedis).toEqual(lastBatch.timeInRedis)
          done()
        } catch (error) {
          done(error)
        }
      }
      const redis = redisLoader(redisUrl, { keyPrefix, logger })
      bluebird.join(
        redis.ping(),
        redis.ping(),
        redis.ping()
      ).catch(done)
    })

    it('logs errors and stats in the loader', done => {
      let callCount = 0
      function logger (stats) {
        const { batchCount, lastBatch, commandCount, responseCount, timeInRedis, batches } = stats
        callCount++
        try {
          expect(callCount).toEqual(1)
          expect(lastBatch.error).toBeInstanceOf(Error)
          expect(lastBatch.commands).toEqual([[ 'zadd', 'foo' ]])
          expect(commandCount).toEqual(1)
          expect(responseCount).toEqual(0)
          expect(batchCount).toEqual(1)
          expect(lastBatch.timeInRedis).toBeGreaterThanOrEqual(0)
          expect(timeInRedis).toEqual(lastBatch.timeInRedis)
          done()
        } catch (error) {
          done(error)
        }
      }
      const redis = redisLoader(redisUrl, { keyPrefix, logger })
      expect(redis.zadd('foo')).rejects.toThrow('err').catch(done)
    })
  })

  describe('Buffers', async () => {
    it('can batch buffer commands to redis', async () => {
      const results = await bluebird.join(
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

  describe('Streams', () => {
    it('can handle streams', async () => {
      await bluebird.join(
        redis.zadd('foo', '0', 'abc'),
        redis.zadd('foo', '0', 'def'),
        redis.zadd('foo', '0', 'ghi')
      )
      redis.resetStats()
      expect(await collect(redis.zscanStream('foo'))).toEqual([[ 'abc', '0', 'def', '0', 'ghi', '0' ]])
      const { batchCount } = redis.stats
      expect(batchCount).toEqual(1)
    })
  })

  describe('PubSub', () => {
    it('can publish messages', done => {
      const sub = redisLoader(redisUrl, { keyPrefix })
      sub.redis.on('message', (channel, message) => {
        expect(channel).toEqual('11')
        expect(message).toEqual('pix')
        done()
      })

      sub.redis.subscribe('11').then(subscriptions => {
        expect(subscriptions).toEqual(1)
        const pub = redisLoader(redisUrl, { keyPrefix })
        pub.publish('11', 'pix')
      })
    })

    it('can subscribe to messages', done => {
      const sub = redisLoader(redisUrl, { keyPrefix })
      sub.on('message', (channel, message) => {
        expect(channel).toEqual('7')
        expect(message).toEqual('action news')
        done()
      })

      sub.subscribe('7').then(subscriptions => {
        expect(subscriptions).toEqual(1)
        const pub = redisLoader(redisUrl, { keyPrefix })
        pub.redis.publish('7', 'action news')
      })
    })
  })
})
