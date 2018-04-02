# RedisLoader
An [`ioredis`](https://github.com/luin/ioredis)-like object that batches commands via [`dataloader`](https://github.com/facebook/dataloader). Under the hood we have `dataloader` utilize redis's `multi` transactions to group commands called. We also support batching in streams, using [`bluestream`](https://github.com/bustle/bluestream) to make sure promises/async functions play nice in them.

### Installation
```
npm i --save redis-loader
```

### Examples
```js
// RedisLoader supports an optional logger function that takes Node-style callbacks
function logger (err, { tripCountTotal, commandCount, commandCountTotal, timeInRedis, timeInRedisTotal }) {
  //...
}
// set up like you would `ioredis`
const redis = redisLoader('redis://localhost:6379/1', { keyPrefix: 'foo', logger })
// three commands sent to Redis together
await Promise.join(
  redis.ping(),
  redis.dbsize(),
  redis.time()
)
// three commands sent seperately to redis
await redis.ping()
await redis.dbsize()
await redis.time()
```
