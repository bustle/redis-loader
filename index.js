import * as Redis from 'ioredis'
import RedisLoader from './src/redis-loader'

export default function redisLoader(redisUrl, options) {
  const { logger } = options
  const redisOptions = { ...options, logger: undefined }
  const redis = new Redis(redisUrl, redisOptions)

  if (logger) {
    redis.on('error', err => logger(err))
  }

  return new RedisLoader({ redis, logger })
}
