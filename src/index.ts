import * as Redis from 'ioredis'
import { RedisOptions } from 'ioredis'
import { RedisLoader, statsLogger } from './redis-loader'

export interface redisLoaderHelperOptions extends RedisOptions {
  logger?: statsLogger
}

export default function redisLoader(redisUrl, options: redisLoaderHelperOptions = {}) {
  const { logger, ...redisOptions } = options
  const redis = new Redis(redisUrl, redisOptions)
  return new RedisLoader({ redis, logger })
}

export { RedisLoader }
