import RedisLoader from "../../src/redis/loader"
import connector from "../../src/redis/connector"

const keyPrefix = "_test_"

const redis = connector({ redisURL: "redis://localhost:6379/8", keyPrefix })

export const redisLoader = new RedisLoader({ redis })

export async function cleanup() {
  const keys = await redisLoader.keys(keyPrefix + "*")

  if (keys.length !== 0) {
    await redisLoader.del(...keys.map(key => key.replace(keyPrefix, "*")))
  }
}
