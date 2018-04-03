import redisLoader from '../src/index'

export const keyPrefix = '_test_'
export const redisUrl = 'redis://localhost:6379/8'
export const redis = redisLoader(redisUrl, { keyPrefix })
