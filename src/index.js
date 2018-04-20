import * as Redis from 'ioredis'
import RedisLoader from './redis-loader'

export default function redisLoader(redisUrl, options = {}) {
  const { logger, ...redisOptions } = options
  const redis = new Redis(redisUrl, redisOptions)

  if (logger) {
    redis.on('error', err => logger(err))
  }

  return new RedisLoader({ redis, logger })
}

export { RedisLoader }
