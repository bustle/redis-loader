import Redis, { RedisOptions } from 'ioredis'
import { RedisLoader, statsLogger } from './redis-loader'
export { RedisLoader }

export interface RedisLoaderHelperOptions extends RedisOptions {
  logger?: statsLogger
  maxBatchSize?: number
}

export default function redisLoader(redisUrl, options: RedisLoaderHelperOptions = {}) {
  const { logger, maxBatchSize, ...redisOptions } = options
  const redis = new Redis(redisUrl, redisOptions)
  return new RedisLoader({ redis, logger, maxBatchSize })
}
