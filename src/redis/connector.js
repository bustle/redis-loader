import * as Redis from "ioredis"
import { parse as urlParse } from "url"

export default function connectRedis({ redisURL, sentinels, keyPrefix = "", showFriendlyErrorStack = false } = {}) {
  let redis
  if (!sentinels) {
    redis = new Redis(redisURL, { showFriendlyErrorStack, keyPrefix })
  } else {
    const { host: name } = urlParse(redisURL)
    redis = new Redis(redisURL, {
      name,
      sentinels,
      keyPrefix,
      showFriendlyErrorStack
    })
  }

  redis.on("error", (err) => {
    console.log(err)
  })

  return redis
}
