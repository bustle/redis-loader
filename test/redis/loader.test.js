import { redisLoader, cleanup } from "../helpers/redis"

describe("Redis - Loader", async () => {
  beforeEach(async () => {
    redisLoader.resetStats()
    await cleanup()
  })

  it("can batch commands to Redis", async () => {
    console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`)
    console.log(redisLoader)
    console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`)
    await Promise.join(
      redisLoader.ping(),
      redisLoader.dbsize(),
      redisLoader.time()
    )
    const { tripCountTotal, commandCountTotal, timeInRedis } = redisLoader.stats()
    expect(commandCountTotal).toBe(3)
    expect(tripCountTotal).toBe(1)
    expect(timeInRedis).toBeGreaterThan(1)
  })

  it("can reset batch command counts", async () => {
    await Promise.join(
      redisLoader.ping(),
      redisLoader.dbsize(),
      redisLoader.time()
    )
    redisLoader.resetStats()
    const { tripCountTotal, commandCountTotal, timeInRedis } = redisLoader.stats()
    expect(commandCountTotal).toBe(0)
    expect(tripCountTotal).toBe(0)
    expect(timeInRedis).toBe(0)
  })

  describe("Buffers", async () => {
    it("can batch buffer commands to redis", async () => {
      const results = await Promise.join(
        redisLoader.pingBuffer(),
        redisLoader.dbsizeBuffer(),
        redisLoader.timeBuffer()
      )
      console.log(results)
    })
  })
})
