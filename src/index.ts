import * as Redis from 'ioredis'
import { RedisLoader, statsLogger } from './redis-loader'

export interface RedisLoaderHelperOptions extends Redis.RedisOptions {
  logger?: statsLogger
}

export default function redisLoader(redisUrl, options: RedisLoaderHelperOptions = {}) {
  const { logger, ...redisOptions } = options
  const redis = new Redis(redisUrl, redisOptions)
  return new RedisLoader({ redis, logger })
}

export { RedisLoader }
