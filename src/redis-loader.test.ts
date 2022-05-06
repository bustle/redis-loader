import { collect as collectItr, flatten } from 'streaming-iterables'
import redisLoader from '.'

const keyPrefix = '_test_'
const redisUrl = 'redis://localhost:6379/8'
const redis = redisLoader(redisUrl, { keyPrefix })

describe('Redis - Loader', () => {
  beforeEach(async () => {
    await redis.flushdb()
    redis.resetStats()
  })

  afterAll(() => {
    redis.disconnect()
  })

  it('can batch commands to Redis', async () => {
    await Promise.all([
      redis.ping(),
      redis.dbsize(),
      redis.time()
    ])
    const { batchCount, lastBatch, commandCount, responseCount, timeInRedis } = redis.stats
    if (!lastBatch) {
      throw new Error('expected lastBatch')
    }
    expect(lastBatch.commands).toEqual([['ping'], ['dbsize'], ['time']])
    expect(lastBatch.commandCount).toEqual(3)
    expect(lastBatch.responseCount).toEqual(3)
    expect(lastBatch.timeInRedis).toBeGreaterThanOrEqual(0)
    expect(commandCount).toEqual(3)
    expect(responseCount).toEqual(3)
    expect(batchCount).toEqual(1)
    expect(timeInRedis).toBeGreaterThanOrEqual(0)
  })

  it('can set batch size', async () => {
    const batchRedis = redisLoader(redisUrl, { keyPrefix, maxBatchSize: 1 })
    await Promise.all([
      batchRedis.ping(),
      batchRedis.dbsize(),
      batchRedis.time()
    ])
    expect(batchRedis.stats.lastBatch && batchRedis.stats.lastBatch.commandCount).toEqual(1)
    expect(batchRedis.stats.batchCount).toEqual(3)
    batchRedis.disconnect()
  })

  it('can reset batch command counts', async () => {
    await Promise.all([
      redis.ping(),
      redis.dbsize(),
      redis.time()
    ])
    redis.resetStats()
    const { batchCount, lastBatch, commandCount, responseCount, timeInRedis, batches } = redis.stats
    expect(batchCount).toEqual(0)
    expect(lastBatch).toEqual(null)
    expect(commandCount).toEqual(0)
    expect(responseCount).toEqual(0)
    expect(timeInRedis).toEqual(0)
    expect(batches.size).toEqual(0)
  })

  it('skips multi if batch size is 1', async () => {
    await redis.ping()
    const { stats, stats: { lastBatch } } = redis
    expect(stats.batchCount).toEqual(1)
    expect(lastBatch && lastBatch.commandCount).toEqual(1)
    expect(lastBatch && lastBatch.commands).toEqual([['ping']])
    expect(lastBatch && lastBatch.multi).toEqual(false)
  })

  describe('Logging', () => {
    it('logs data when commands are batched', done => {
      let callCount = 0
      function logger (stats) {
        const { batchCount, lastBatch, commandCount, responseCount, timeInRedis, batches } = stats
        callCount++
        try {
          expect(callCount).toEqual(1)
          expect(batchCount).toEqual(1)
          expect(lastBatch.commands).toEqual([['ping'], ['ping'], ['ping']])
          expect(lastBatch.response).toEqual([[null, 'PONG'], [null, 'PONG'], [null, 'PONG']])
          expect(lastBatch.responseCount).toEqual(3)
          expect(lastBatch.multi).toEqual(true)
          expect(responseCount).toEqual(3)
          expect(lastBatch.commandCount).toEqual(3)
          expect(commandCount).toEqual(3)
          expect(lastBatch.timeInRedis).toBeGreaterThanOrEqual(0)
          expect(timeInRedis).toEqual(lastBatch.timeInRedis)
          expect(batches.size).toEqual(0)
          loggingRedis.disconnect()
          done()
        } catch (error) {
          done(error)
        }
      }
      const loggingRedis = redisLoader(redisUrl, { keyPrefix, logger })
      Promise.all([
        loggingRedis.ping(),
        loggingRedis.ping(),
        loggingRedis.ping()
      ]).catch(done)
    })

    it('converts to json nicely', done => {
      function logger (stats) {
        try {
          const json = JSON.parse(JSON.stringify(stats))
          expect(json).toMatchObject({
            'batches': [], // Sets don't json so this has to be json'd as an array
            'batchCount': 1,
            'commandCount': 3,
            'responseCount': 3,
            'lastBatch': {
              'commands': [['ping'], ['ping'], ['ping']],
              'response': [[null, 'PONG'], [null, 'PONG'], [null, 'PONG']],
              'error': null,
              multi: true
            }
          })
          loggingRedis.disconnect()
          done()
        } catch (error) {
          loggingRedis.disconnect()
          done(error)
        }
      }
      const loggingRedis = redisLoader(redisUrl, { keyPrefix, logger })
      Promise.all([
        loggingRedis.ping(),
        loggingRedis.ping(),
        loggingRedis.ping()
      ]).catch(done)
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
          expect(batches.size).toEqual(0)
          loggingRedis.disconnect()
          done()
        } catch (error) {
          done(error)
        }
      }
      const loggingRedis = redisLoader(redisUrl, { keyPrefix, logger })
      expect(loggingRedis.zadd('foo')).rejects.toThrow('ERR').catch(done)
    })
  })

  describe('Buffers', () => {
    it('can batch buffer commands to redis', async () => {
      const results = await Promise.all([
        redis.pingBuffer(),
        redis.pingBuffer(),
        redis.pingBuffer()
      ])
      results.forEach(result => {
        expect(result).toBeInstanceOf(Buffer)
        expect(result.toString()).toEqual('PONG')
      })
    })
  })

  describe('Streams', () => {
    it('can handle streams', async () => {
      await Promise.all([
        redis.zadd('foo', '0', 'abc'),
        redis.zadd('foo', '0', 'def'),
        redis.zadd('foo', '0', 'ghi')
      ])
      redis.resetStats()
      expect(await collectItr(redis.zscanStream('foo'))).toEqual([[ 'abc', '0', 'def', '0', 'ghi', '0' ]])
      const { batchCount } = redis.stats
      expect(batchCount).toEqual(1)
    })
  })

  describe('asyncIterators', () => {
    it('iterators a scan', async () => {
      await Promise.all([
        redis.zadd('foo', '0', 'abc'),
        redis.zadd('foo', '0', 'def'),
        redis.zadd('foo', '0', 'ghi')
      ])
      redis.resetStats()
      expect(await collectItr(redis.zscanIterable('foo'))).toEqual([[ 'abc', '0', 'def', '0', 'ghi', '0' ]])
      const { batchCount } = redis.stats
      expect(batchCount).toEqual(1)
    })

    it('returns a custom async iterator from the stream', async () => {
      await Promise.all([
        redis.zadd('foo', '0', 'abc'),
        redis.zadd('foo', '0', 'def'),
        redis.zadd('foo', '0', 'ghi')
      ])
      redis.resetStats()
      expect(await collectItr(redis.zscanStream('foo'))).toEqual([[ 'abc', '0', 'def', '0', 'ghi', '0' ]])
      const { batchCount } = redis.stats
      expect(batchCount).toEqual(1)
    })
    it('paginates', async () => {
      const work = []
      for (let i = 0; i < 500; i++) {
        redis.zadd('foo', String(i), `member${i}`)
      }
      await Promise.all(work)
      const results = await collectItr(redis.zscanIterable('foo', { count: 10 }))
      const { batchCount } = redis.stats
      expect(results.length).toBeGreaterThan(1)
      expect(batchCount).toBeGreaterThan(1)
      expect((await collectItr(flatten(results)))).toHaveLength(1000)
    })
  })

  describe('PubSub', () => {
    it('can publish messages', done => {
      const sub = redisLoader(redisUrl, { keyPrefix })
      const pub = redisLoader(redisUrl, { keyPrefix })
      sub.redis.on('message', (channel, message) => {
        expect(channel).toEqual('11')
        expect(message).toEqual('pix')
        sub.disconnect()
        pub.disconnect()
        done()
      })

      sub.redis.subscribe('11').then(subscriptions => {
        expect(subscriptions).toEqual(1)
        pub.publish('11', 'pix')
      })
    })

    it('can subscribe to messages', done => {
      const sub = redisLoader(redisUrl, { keyPrefix })
      const pub = redisLoader(redisUrl, { keyPrefix })
      sub.on('message', (channel, message) => {
        expect(channel).toEqual('7')
        expect(message).toEqual('action news')
        sub.disconnect()
        pub.disconnect()
        done()
      })

      sub.subscribe('7').then(subscriptions => {
        expect(subscriptions).toEqual(1)
        pub.redis.publish('7', 'action news')
      })
    })
  })
})
