# RedisLoader
An [`ioredis`](https://github.com/luin/ioredis)-like object that batches commands via [`dataloader`](https://github.com/facebook/dataloader). Under the hood we have `dataloader` utilize redis's `multi` transactions and [pipelining](https://redis.io/topics/pipelining) to group commands called. We also support batching in streams, using [`bluestream`](https://github.com/bustle/bluestream) to make sure promises/async functions play nice in them.

### Installation
```
npm i --save redis-loader

or

yarn add redis-loader
```

### Examples
```js
// RedisLoader supports an optional logger function with stats on each batch of commands
function logger (stats) {
  //...
}
// set up like you would `ioredis`
const redis = redisLoader('redis://localhost:6379/1', { keyPrefix: 'foo', logger })

// or setup ioredis
const redis = new Redis(redisUrl, redisOptions)
const redisLoader = new RedisLoader({ redis, logger })

// three commands sent to Redis together in one multi
await Promise.all([
  redis.ping(),
  redis.dbsize(),
  redis.time()
])

// three commands sent separately to redis
await redis.ping()
await redis.dbsize()
await redis.time()
```
