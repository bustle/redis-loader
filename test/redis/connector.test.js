import connector from '../../src/redis/connector'

describe('Redis - Connector', async () => {
  it('can connect to Redis', async () => {
    const redis = connector({ redisURL: 'redis://localhost:6379/8' })
    expect(await redis.ping()).toBe('PONG')
  })
})
