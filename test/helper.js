import redisLoader from '../src/index'

export const keyPrefix = '_test_'
export const redisUrl = 'redis://localhost:6379/8'

export const redis = redisLoader(redisUrl, { keyPrefix })

export async function cleanup() {
  const keys = await redis.keys(keyPrefix + '*')

  if (keys.length !== 0) {
    await redis.del(...keys.map(key => key.replace(keyPrefix, '*')))
  }
}
