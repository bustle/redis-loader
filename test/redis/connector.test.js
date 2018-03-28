import connector from "../../src/redis/connector"
describe("Redis - Connector", async () => {
  it("can connect to Redis", async () => {
    const redis = connector({ redisURL: "redis://localhost:6379/8" })
    console.log('-------------------------------------------------')
    console.log(redis)
    console.log('-------------------------------------------------')
    const response = await redis.ping()
    expect(response).toBe("PONG")
  })
})
