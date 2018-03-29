import { collect } from 'bluestream'
import { redisLoader, cleanup } from '../helpers/redis'

describe('Redis - Loader', async () => {
  beforeEach(async () => {
    await cleanup()
    redisLoader.resetStats()
  })

  it('can batch commands to Redis', async () => {
    await Promise.join(
      redisLoader.ping(),
      redisLoader.dbsize(),
      redisLoader.time()
    )
    const { tripCountTotal, commandCountTotal, timeInRedis } = redisLoader.stats()
    expect(commandCountTotal).toEqual(3)
    expect(tripCountTotal).toEqual(1)
    expect(timeInRedis).toBeGreaterThan(0)
  })

  it('can reset batch command counts', async () => {
    await Promise.join(
      redisLoader.ping(),
      redisLoader.dbsize(),
      redisLoader.time()
    )
    redisLoader.resetStats()
    const { tripCountTotal, commandCountTotal, timeInRedis } = redisLoader.stats()
    expect(commandCountTotal).toEqual(0)
    expect(tripCountTotal).toEqual(0)
    expect(timeInRedis).toEqual(0)
  })

  describe('Buffers', async () => {
    it('can batch buffer commands to redis', async () => {
      const results = await Promise.join(
        redisLoader.pingBuffer(),
        redisLoader.pingBuffer(),
        redisLoader.pingBuffer()
      )
      results.forEach(result => {
        expect(Buffer.isBuffer(result)).toBeTruthy(),
        expect(result.toString()).toEqual('PONG')
      })
    })
  })

  describe('Streams', async () => {
    it('can handle streams', async () => {
      await Promise.join(
        redisLoader.zadd('foo', 0, 'abc'),
        redisLoader.zadd('foo', 0, 'def'),
        redisLoader.zadd('foo', 0, 'ghi')
      )
      expect(await collect(redisLoader.zscanStream('foo'))).toEqual([[ 'abc', '0', 'def', '0', 'ghi', '0' ]])
    })
  })
})
