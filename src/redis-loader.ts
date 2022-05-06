import { EventEmitter } from 'events'
import DataLoader from 'dataloader'
import { list as redisCommandList } from 'redis-commands'
import { ScanStream, ScanStreamOptions } from './scan-stream'
import { Redis } from 'ioredis'
import { RedisStats, BatchStats } from './stats'
import { scanIterable, ScanIterableOptions } from './scan-iterable'

export { BatchStats }
export { ScanIterableOptions, ScanStreamOptions }
export type statsLogger = (stats: RedisStats) => void
type stringable = number | string | Buffer

export interface IRedisLoaderOptions {
  redis: Redis
  logger?: statsLogger
  maxBatchSize?: number
}

export class RedisLoader implements EventEmitter {
  public stats: RedisStats
  public redis: Redis
  private logger: statsLogger | undefined
  private dataLoader: DataLoader<unknown, unknown>

  constructor({ redis, logger, maxBatchSize = Infinity }: IRedisLoaderOptions) {
    if (!redis) { throw new Error('"redis" is required') }
    this.logger = logger
    this.stats = new RedisStats()
    this.redis = redis
    this.dataLoader = new DataLoader(commands => this.batchFunction(commands as string[][]), { cache: false, maxBatchSize })
  }

  resetStats() {
    this.stats = new RedisStats()
  }

  get _redis() {
    return this.redis
  }

  private startBatch(batchInfo) {
    return this.stats.startBatch(batchInfo)
  }

  private endBatch(batchStats, error, response) {
    this.stats.endBatch(batchStats, error, response)
    this.logStats()
  }

  private logStats() {
    if (this.logger) {
      this.logger(this.stats)
    }
  }

  batchFunction(commands: stringable[][]) : Promise<any> {
    if (!(commands && commands.length > 0)) { throw new Error('no commands to run') }
    if (commands.length === 1) {
      return this.executeSingle(commands)
    }
    return this.executeMulti(commands)
  }

  private async executeMulti(commands) {
    const batchStats = this.startBatch({ commands, multi: true })
    try {
      const response = await this.redis.multi(commands).exec()
      this.endBatch(batchStats, null, response)
      return response.map(([error, data]) => error || data)
    } catch (error) {
      if (Array.isArray(error.previousErrors)) {
        error.message = `${error.message}: ${error.previousErrors.map(e => e && e.message)}`
      }
      this.endBatch(batchStats, error, null)
      throw error
    }
  }

  private async executeSingle(commands) {
    const batchStats = this.startBatch({ commands, multi: false })
    const [command, ...args] = commands[0]
    try {
      const response = await this.redis[command](...args)
      this.endBatch(batchStats, null, [response])
      return [response]
    } catch (error) {
      this.endBatch(batchStats, error, null)
      throw error
    }
  }

  // Dynamically generated methods
  // copied from https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/ioredis/index.d.ts
  // mixing in methods from ioredis itself isn't really possible
  // https://www.typescriptlang.org/docs/handbook/mixins.html

  // STRING COMMANDS BEGIN
  bitcount: (key: stringable, start?: stringable, end?: stringable) => Promise<number>
  bitcountBuffer: (key: stringable, start?: stringable, end?: stringable) => Promise<number>
  get: (key: stringable) => Promise<string>
  getBuffer: (key: stringable) => Promise<string>
  set: (key: stringable, value: stringable, ...args: stringable[]) => any
  setBuffer: (key: stringable, value: stringable, ...args: stringable[]) => any
  setnx: (key: stringable, value: stringable) => Promise<any>
  setnxBuffer: (key: stringable, value: stringable) => Promise<any>
  setex: (key: stringable, seconds: stringable, value: stringable) => Promise<any>
  setexBuffer: (key: stringable, seconds: stringable, value: stringable) => Promise<any>
  psetex: (key: stringable, milliseconds: stringable, value: stringable) => Promise<any>
  psetexBuffer: (key: stringable, milliseconds: stringable, value: stringable) => Promise<any>
  append: (key: stringable, value: stringable) => Promise<number>
  appendBuffer: (key: stringable, value: stringable) => Promise<number>
  strlen: (key: stringable) => Promise<number>
  strlenBuffer: (key: stringable) => Promise<number>
  del: (...keys: stringable[]) => any
  delBuffer: (...keys: stringable[]) => any
  dump: (key: stringable) => Promise<string>
  dumpBuffer: (key: stringable) => Promise<string>
  exists: (...keys: stringable[]) => any
  existsBuffer: (...keys: stringable[]) => any
  setbit: (key: stringable, offset: stringable, value: stringable) => Promise<number>
  setbitBuffer: (key: stringable, offset: stringable, value: stringable) => Promise<number>
  getbit: (key: stringable, offset: stringable) => Promise<number>
  getbitBuffer: (key: stringable, offset: stringable) => Promise<number>
  setrange: (key: stringable, offset: stringable, value: stringable) => Promise<number>
  setrangeBuffer: (key: stringable, offset: stringable, value: stringable) => Promise<number>
  getrange: (key: stringable, start: stringable, end: stringable) => Promise<string>
  getrangeBuffer: (key: stringable, start: stringable, end: stringable) => Promise<string>
  substr: (key: stringable, start: stringable, end: stringable) => Promise<string>
  substrBuffer: (key: stringable, start: stringable, end: stringable) => Promise<string>
  incr: (key: stringable) => Promise<number>
  incrBuffer: (key: stringable) => Promise<number>
  decr: (key: stringable) => Promise<number>
  decrBuffer: (key: stringable) => Promise<number>
  mget: (...keys: stringable[]) => any
  mgetBuffer: (...keys: stringable[]) => any
  incrby: (key: stringable, increment: stringable) => Promise<number>
  incrbyBuffer: (key: stringable, increment: stringable) => Promise<number>
  incrbyfloat: (key: stringable, increment: stringable) => Promise<number>
  incrbyfloatBuffer: (key: stringable, increment: stringable) => Promise<number>
  decrby: (key: stringable, decrement: stringable) => Promise<number>
  decrbyBuffer: (key: stringable, decrement: stringable) => Promise<number>
  getset: (key: stringable, value: stringable) => Promise<string>
  getsetBuffer: (key: stringable, value: stringable) => Promise<string>
  mset: (key: stringable, value: stringable, ...args: stringable[]) => any
  msetBuffer: (key: stringable, value: stringable, ...args: stringable[]) => any
  msetnx: (key: stringable, value: stringable, ...args: stringable[]) => any
  msetnxBuffer: (key: stringable, value: stringable, ...args: stringable[]) => any
  // STRING COMMANDS BEGIN

  // LIST COMMANDS BEGIN
  rpush: (key: stringable, ...values: stringable[]) => any
  rpushBuffer: (key: stringable, ...values: stringable[]) => any
  lpush: (key: stringable, ...values: stringable[]) => any
  lpushBuffer: (key: stringable, ...values: stringable[]) => any
  rpushx: (key: stringable, value: stringable) => Promise<number>
  rpushxBuffer: (key: stringable, value: stringable) => Promise<number>
  lpushx: (key: stringable, value: stringable) => Promise<number>
  lpushxBuffer: (key: stringable, value: stringable) => Promise<number>
  linsert: (key: stringable, direction: 'BEFORE' | 'AFTER', pivot: stringable, value: stringable) => Promise<number>
  linsertBuffer: (key: stringable, direction: 'BEFORE' | 'AFTER', pivot: stringable, value: stringable) => Promise<number>
  rpop: (key: stringable) => Promise<string>
  rpopBuffer: (key: stringable) => Promise<string>
  lpop: (key: stringable) => Promise<string>
  lpopBuffer: (key: stringable) => Promise<string>
  brpop: (...keys: stringable[]) => any
  brpopBuffer: (...keys: stringable[]) => any
  blpop: (...keys: stringable[]) => any
  blpopBuffer: (...keys: stringable[]) => any
  brpoplpush: (source: stringable, destination: stringable, timeout: stringable) => Promise<any>
  brpoplpushBuffer: (source: stringable, destination: stringable, timeout: stringable) => Promise<any>
  llen: (key: stringable) => Promise<number>
  llenBuffer: (key: stringable) => Promise<number>
  lindex: (key: stringable, index: stringable) => Promise<string>
  lindexBuffer: (key: stringable, index: stringable) => Promise<string>
  lset: (key: stringable, index: stringable, value: stringable) => Promise<any>
  lsetBuffer: (key: stringable, index: stringable, value: stringable) => Promise<any>
  lrange: (key: stringable, start: stringable, stop: stringable) => Promise<any>
  lrangeBuffer: (key: stringable, start: stringable, stop: stringable) => Promise<any>
  ltrim: (key: stringable, start: stringable, stop: stringable) => Promise<any>
  ltrimBuffer: (key: stringable, start: stringable, stop: stringable) => Promise<any>
  lrem: (key: stringable, count: stringable, value: stringable) => Promise<number>
  lremBuffer: (key: stringable, count: stringable, value: stringable) => Promise<number>
  rpoplpush: (source: stringable, destination: stringable) => Promise<string>
  rpoplpushBuffer: (source: stringable, destination: stringable) => Promise<string>
  // LIST COMMANDS END

  // SET COMMANDS BEGIN
  sadd: (key: stringable, ...members: stringable[]) => any
  saddBuffer: (key: stringable, ...members: stringable[]) => any
  srem: (key: stringable, ...members: stringable[]) => any
  sremBuffer: (key: stringable, ...members: stringable[]) => any
  smove: (source: stringable, destination: stringable, member: stringable) => Promise<string>
  smoveBuffer: (source: stringable, destination: stringable, member: stringable) => Promise<string>
  sismember: (key: stringable, member: stringable) => Promise<1 | 0>
  sismemberBuffer: (key: stringable, member: stringable) => Promise<1 | 0>
  scard: (key: stringable) => Promise<number>
  scardBuffer: (key: stringable) => Promise<number>
  spop: (key: stringable, count?: stringable) => Promise<any>
  spopBuffer: (key: stringable, count?: stringable) => Promise<any>
  srandmember: (key: stringable, count?: stringable) => Promise<any>
  srandmemberBuffer: (key: stringable, count?: stringable) => Promise<any>
  sinter: (...keys: stringable[]) => any
  sinterBuffer: (...keys: stringable[]) => any
  sinterstore: (destination: stringable, ...keys: stringable[]) => any
  sinterstoreBuffer: (destination: stringable, ...keys: stringable[]) => any
  sunion: (...keys: stringable[]) => any
  sunionBuffer: (...keys: stringable[]) => any
  sunionstore: (destination: stringable, ...keys: stringable[]) => any
  sunionstoreBuffer: (destination: stringable, ...keys: stringable[]) => any
  sdiff: (...keys: stringable[]) => any
  sdiffBuffer: (...keys: stringable[]) => any
  sdiffstore: (destination: stringable, ...keys: stringable[]) => any
  sdiffstoreBuffer: (destination: stringable, ...keys: stringable[]) => any
  smembers: (key: stringable) => Promise<any>
  smembersBuffer: (key: stringable) => Promise<any>
  sscan: (key: stringable, cursor: stringable, ...args: stringable[]) => [string, string[]]
  sscanBuffer: (key: stringable, cursor: stringable, ...args: stringable[]) => [Buffer, Buffer[]]
  sscanStream: (options?: ScanStreamOptions) => ScanStream
  sscanBufferStream: (options?: ScanStreamOptions) => ScanStream
  sscanIterable: (options?: ScanIterableOptions) => AsyncIterableIterator<string[]>
  sscanBufferIterable: (options?: ScanIterableOptions) => AsyncIterableIterator<Buffer[]>
  // SET COMMANDS END

  // SORTED SET COMMANDS BEGIN
  zadd: (key: stringable, ...args: stringable[]) => any
  zaddBuffer: (key: stringable, ...args: stringable[]) => any
  zincrby: (key: stringable, increment: stringable, member: stringable) => Promise<any>
  zincrbyBuffer: (key: stringable, increment: stringable, member: stringable) => Promise<any>
  zrem: (key: stringable, ...members: stringable[]) => any
  zremBuffer: (key: stringable, ...members: stringable[]) => any
  zremrangebyscore: (key: stringable, min: stringable, max: stringable) => Promise<any>
  zremrangebyscoreBuffer: (key: stringable, min: stringable, max: stringable) => Promise<any>
  zremrangebyrank: (key: stringable, start: stringable, stop: stringable) => Promise<any>
  zremrangebyrankBuffer: (key: stringable, start: stringable, stop: stringable) => Promise<any>
  zunionstore: (destination: stringable, numkeys: stringable, key: stringable, ...args: stringable[]) => any
  zunionstoreBuffer: (destination: stringable, numkeys: stringable, key: stringable, ...args: stringable[]) => any
  zinterstore: (destination: stringable, numkeys: stringable, ...args: stringable[]) => any
  zinterstoreBuffer: (destination: stringable, numkeys: stringable, ...args: stringable[]) => any
  zrange: (key: stringable, start: stringable, stop: stringable, withScores?: 'WITHSCORES') => Promise<any>
  zrangeBuffer: (key: stringable, start: stringable, stop: stringable, withScores?: 'WITHSCORES') => Promise<any>
  zrevrange: (key: stringable, start: stringable, stop: stringable, withScores?: 'WITHSCORES') => Promise<any>
  zrevrangeBuffer: (key: stringable, start: stringable, stop: stringable, withScores?: 'WITHSCORES') => Promise<any>
  zrangebyscore: (key: stringable, min: stringable, max: stringable, ...args: (string | stringable)[]) => any
  zrangebyscoreBuffer: (key: stringable, min: stringable, max: stringable, ...args: (string | stringable)[]) => any
  zrevrangebyscore: (key: stringable, max: stringable, min: stringable, ...args: (string | stringable)[]) => any
  zrevrangebyscoreBuffer: (key: stringable, max: stringable, min: stringable, ...args: (string | stringable)[]) => any
  zrangebylex: (key: stringable, min: stringable, max: stringable, ...args: (string | stringable)[]) => any
  zrangebylexBuffer: (key: stringable, min: stringable, max: stringable, ...args: (string | stringable)[]) => any
  zrevrangebylex: (key: stringable, max: stringable, min: stringable, ...args: (string | stringable)[]) => any
  zrevrangebylexBuffer: (key: stringable, max: stringable, min: stringable, ...args: (string | stringable)[]) => any
  zcount: (key: stringable, min: stringable, max: stringable) => Promise<number>
  zcountBuffer: (key: stringable, min: stringable, max: stringable) => Promise<number>
  zlexcount: (key: stringable, min: stringable, max: stringable) => Promise<number>
  zlexcountBuffer: (key: stringable, min: stringable, max: stringable) => Promise<number>
  zcard: (key: stringable) => Promise<number>
  zcardBuffer: (key: stringable) => Promise<number>
  zscore: (key: stringable, member: stringable) => Promise<number>
  zscoreBuffer: (key: stringable, member: stringable) => Promise<number>
  zrank: (key: stringable, member: stringable) => Promise<number>
  zrankBuffer: (key: stringable, member: stringable) => Promise<number>
  zrevrank: (key: stringable, member: stringable) => Promise<number>
  zrevrankBuffer: (key: stringable, member: stringable) => Promise<number>
  zpopmax: (key: stringable, count?: stringable) => any
  zpopmaxBuffer: (key: stringable, count?: stringable) => any
  zpopmin: (key: stringable, count?: stringable) => any
  zpopminBuffer: (key: stringable, count?: stringable) => any
  bzpopmax: (key: stringable, ...keysOrTimeout: stringable[]) => any
  bzpopmaxBuffer: (key: stringable, ...keysOrTimeout: stringable[]) => any
  bzpopmin: (key: stringable, ...keysOrTimeout: stringable[]) => any
  bzpopminBuffer: (key: stringable, ...keysOrTimeout: stringable[]) => any
  zscan: (key: stringable, cursor: stringable, ...args: stringable[]) => [string, string[]]
  zscanBuffer: (key: stringable, cursor: stringable, ...args: stringable[]) => [Buffer, Buffer[]]
  zscanStream: (key: stringable, options?: ScanStreamOptions) => ScanStream
  zscanBufferStream: (key: stringable, options?: ScanStreamOptions) => ScanStream
  zscanIterable: (key: stringable, options?: ScanIterableOptions) => AsyncIterableIterator<string[]>
  zscanBufferIterable: (key: stringable, options?: ScanIterableOptions) => AsyncIterableIterator<Buffer[]>
  // SORTED SET COMMANDS END

  // HASH COMMANDS BEGIN
  hset: (key: stringable, field: stringable, value: stringable) => Promise<0 | 1>
  hsetBuffer: (key: stringable, field: stringable, value: stringable) => Promise<0 | 1>
  hsetnx: (key: stringable, field: stringable, value: stringable) => Promise<0 | 1>
  hsetnxBuffer: (key: stringable, field: stringable, value: stringable) => Promise<0 | 1>
  hget: (key: stringable, field: stringable) => Promise<string>
  hgetBuffer: (key: stringable, field: stringable) => Promise<string>
  hmset: (key: stringable, fieldOrObj: stringable|object, value?: stringable, ...args: stringable[]) => Promise<0 | 1>
  hmsetBuffer: (key: stringable, fieldOrObj: stringable|object, value?: stringable, ...args: stringable[]) => Promise<0 | 1>
  hmget: (key: stringable, ...fields: stringable[]) => any
  hmgetBuffer: (key: stringable, ...fields: stringable[]) => any
  hincrby: (key: stringable, field: stringable, increment: stringable) => Promise<number>
  hincrbyBuffer: (key: stringable, field: stringable, increment: stringable) => Promise<number>
  hincrbyfloat: (key: stringable, field: stringable, increment: stringable) => Promise<number>
  hincrbyfloatBuffer: (key: stringable, field: stringable, increment: stringable) => Promise<number>
  hdel: (key: stringable, ...fields: stringable[]) => any
  hdelBuffer: (key: stringable, ...fields: stringable[]) => any
  hlen: (key: stringable) => Promise<number>
  hlenBuffer: (key: stringable) => Promise<number>
  hkeys: (key: stringable) => Promise<any>
  hkeysBuffer: (key: stringable) => Promise<any>
  hvals: (key: stringable) => Promise<any>
  hvalsBuffer: (key: stringable) => Promise<any>
  hgetall: (key: stringable) => Promise<any>
  hgetallBuffer: (key: stringable) => Promise<any>
  hexists: (key: stringable, field: stringable) => Promise<0 | 1>
  hexistsBuffer: (key: stringable, field: stringable) => Promise<0 | 1>
  hscan: (key: stringable, cursor: stringable, ...args: stringable[]) => [string, string[]]
  hscanBuffer: (key: stringable, cursor: stringable, ...args: stringable[]) => [Buffer, Buffer[]]
  hscanStream: (key: stringable, options?: ScanStreamOptions) => ScanStream
  hscanBufferStream: (key: stringable, options?: ScanStreamOptions) => ScanStream
  hscanIterable: (key: stringable, options?: ScanIterableOptions) => AsyncIterableIterator<string[]>
  hscanBufferIterable: (key: stringable, options?: ScanIterableOptions) => AsyncIterableIterator<Buffer[]>
  // HASH COMMANDS END

  // HYPER LOG LOG COMMANDS BEGIN
  pfmerge: (destkey: stringable, ...sourcekeys: stringable[]) => any
  pfmergeBuffer: (destkey: stringable, ...sourcekeys: stringable[]) => any
  pfadd: (key: stringable, ...elements: stringable[]) => any
  pfaddBuffer: (key: stringable, ...elements: stringable[]) => any
  pfcount: (...keys: stringable[]) => any
  pfcountBuffer: (...keys: stringable[]) => any
  // HYPER LOG LOG COMMANDS END

  // REDIS STREAMS BEGIN
  xack: (key: stringable, group: stringable, ...ids: stringable[]) => any
  xackBuffer: (key: stringable, group: stringable, ...ids: stringable[]) => any
  xadd: (key: stringable, id: stringable | number, ...fieldAndString: Array<string>) => any
  xaddBuffer: (key: stringable, id: stringable | number, ...fieldAndString: Array<string>) => any
  xclaim: (...args: stringable[]) => any
  xclaimBuffer: (...args: stringable[]) => any
  xdel: (key: stringable, ...ids: stringable[]) => any
  xdelBuffer: (key: stringable, ...ids: stringable[]) => any
  xgroup: (...args: stringable[]) => any
  xgroupBuffer: (...args: stringable[]) => any
  xinfo: (...args: stringable[]) => any
  xinfoBuffer: (...args: stringable[]) => any
  xlen: (key: stringable) => any
  xlenBuffer: (key: stringable) => any
  xpending: (key: stringable, group: stringable, ...args: stringable[]) => any
  xpendingBuffer: (key: stringable, group: stringable, ...args: stringable[]) => any
  xrange: (key: stringable, start: stringable, end: stringable, COUNT?: 'COUNT', count?: stringable) => any
  xrangeBuffer: (key: stringable, start: stringable, end: stringable, COUNT?: 'COUNT', count?: stringable) => any
  xread: (...args: stringable[]) => any
  xreadBuffer: (...args: stringable[]) => any
  xreadgroup: (...args: stringable[]) => any
  xreadgroupBuffer: (...args: stringable[]) => any
  xrevrange: (key: stringable, start: stringable, end: stringable, COUNT?: 'COUNT', count?: stringable) => any
  xrevrangeBuffer: (key: stringable, start: stringable, end: stringable, COUNT?: 'COUNT', count?: stringable) => any
  xtrim: (key: stringable, MAXLEN: 'MAXLEN', tilde?: '~', count?: stringable) => any
  xtrimBuffer: (key: stringable, MAXLEN: 'MAXLEN', tilde?: '~', count?: stringable) => any
  // REDIS STREAMS END

  // KEY COMMANDS BEGIN
  move: (key: stringable, db: stringable) => Promise<0 | 1>
  moveBuffer: (key: stringable, db: stringable) => Promise<0 | 1>
  rename: (key: stringable, newkey: stringable) => Promise<string>
  renameBuffer: (key: stringable, newkey: stringable) => Promise<string>
  renamenx: (key: stringable, newkey: stringable) => Promise<0 | 1>
  renamenxBuffer: (key: stringable, newkey: stringable) => Promise<0 | 1>
  expire: (key: stringable, seconds: stringable) => Promise<0 | 1>
  expireBuffer: (key: stringable, seconds: stringable) => Promise<0 | 1>
  pexpire: (key: stringable, milliseconds: stringable) => Promise<0 | 1>
  pexpireBuffer: (key: stringable, milliseconds: stringable) => Promise<0 | 1>
  expireat: (key: stringable, timestamp: stringable) => Promise<0 | 1>
  expireatBuffer: (key: stringable, timestamp: stringable) => Promise<0 | 1>
  migrate: (...args: stringable[]) => any
  migrateBuffer: (...args: stringable[]) => any
  object: (subcommand: stringable, ...args: stringable[]) => any
  objectBuffer: (subcommand: stringable, ...args: stringable[]) => any
  pexpireat: (key: stringable, millisecondsTimestamp: stringable) => Promise<0 | 1>
  pexpireatBuffer: (key: stringable, millisecondsTimestamp: stringable) => Promise<0 | 1>
  keys: (pattern: stringable) => Promise<string[]>
  keysBuffer: (pattern: stringable) => Promise<string[]>
  ttl: (key: stringable) => Promise<number>
  ttlBuffer: (key: stringable) => Promise<number>
  sort: (key: stringable, ...args: stringable[]) => any
  sortBuffer: (key: stringable, ...args: stringable[]) => any
  randomkey: () => Promise<string>
  randomkeyBuffer: () => Promise<string>
  persist: (key: stringable) => Promise<0 | 1>
  persistBuffer: (key: stringable) => Promise<0 | 1>
  type: (key: stringable) => Promise<string>
  typeBuffer: (key: stringable) => Promise<string>
  scan: (cursor: stringable, ...args: stringable[]) => [string, string[]]
  scanBuffer: (cursor: stringable, ...args: stringable[]) => [Buffer, Buffer[]]
  scanStream: (options?: ScanStreamOptions) => ScanStream
  scanBufferStream: (options?: ScanStreamOptions) => ScanStream
  scanIterable: (options?: ScanIterableOptions) => AsyncIterableIterator<string[]>
  scanBufferIterable: (options?: ScanIterableOptions) => AsyncIterableIterator<Buffer[]>
  // KEY COMMANDS END

  // DATABASE COMMANDS BEGIN
  auth: (password: stringable) => Promise<string>
  authBuffer: (password: stringable) => Promise<string>
  echo: (message: stringable) => Promise<string>
  echoBuffer: (message: stringable) => Promise<string>
  ping: (message?: stringable) => Promise<string>
  pingBuffer: (message?: stringable) => Promise<string>
  quit: () => Promise<string>
  quitBuffer: () => Promise<string>
  select: (index: stringable) => Promise<string>
  selectBuffer: (index: stringable) => Promise<string>
  swap: (sourceIndex: stringable, targetIndex: stringable) => Promise<string>
  swapBuffer: (sourceIndex: stringable, targetIndex: stringable) => Promise<string>
  // DATABASE COMMANDS END

  // LUA SCRIPT COMMANDS BEGIN
  eval: (...args: stringable[]) => any
  evalBuffer: (...args: stringable[]) => any
  evalsha: (...args: stringable[]) => any
  evalshaBuffer: (...args: stringable[]) => any
  script: (...args: stringable[]) => any
  scriptBuffer: (...args: stringable[]) => any
  // LUA SCRIPT COMMANDS END

  // PUB SUB COMMANDS BEGIN
  subscribe: (...channels: stringable[]) => any
  subscribeBuffer: (...channels: stringable[]) => any
  unsubscribe: (...channels: stringable[]) => any
  unsubscribeBuffer: (...channels: stringable[]) => any
  psubscribe: (...patterns: stringable[]) => any
  psubscribeBuffer: (...patterns: stringable[]) => any
  punsubscribe: (...patterns: stringable[]) => any
  punsubscribeBuffer: (...patterns: stringable[]) => any
  publish: (channel: stringable, message: stringable) => Promise<number>
  publishBuffer: (channel: stringable, message: stringable) => Promise<number>
  // PUB SUB COMMANDS END

  // MISC COMMANDS BEGIN
  dbsize: () => Promise<number>
  dbsizeBuffer: () => Promise<number>
  save: () => Promise<string>
  saveBuffer: () => Promise<string>
  bgsave: () => Promise<string>
  bgsaveBuffer: () => Promise<string>
  bgrewriteaof: () => Promise<string>
  bgrewriteaofBuffer: () => Promise<string>
  shutdown: (save: 'SAVE' | 'NOSAVE') => Promise<any>
  shutdownBuffer: (save: 'SAVE' | 'NOSAVE') => Promise<any>
  lastsave: () => Promise<number>
  lastsaveBuffer: () => Promise<number>
  exec: () => Promise<any>
  execBuffer: () => Promise<any>
  discard: () => Promise<any>
  discardBuffer: () => Promise<any>
  sync: () => Promise<any>
  syncBuffer: () => Promise<any>
  flushdb: () => Promise<string>
  flushdbBuffer: () => Promise<string>
  flushall: () => Promise<string>
  flushallBuffer: () => Promise<string>
  info: (section?: stringable) => Promise<string>
  infoBuffer: (section?: stringable) => Promise<string>
  time: () => Promise<any>
  timeBuffer: () => Promise<any>
  slaveof: (host: stringable, port: stringable) => Promise<string>
  slaveofBuffer: (host: stringable, port: stringable) => Promise<string>
  debug: (...args: stringable[]) => any
  debugBuffer: (...args: stringable[]) => any
  config: (...args: stringable[]) => any
  configBuffer: (...args: stringable[]) => any
  watch: (...keys: stringable[]) => any
  watchBuffer: (...keys: stringable[]) => any
  unwatch: () => Promise<string>
  unwatchBuffer: () => Promise<string>
  cluster: (...args: stringable[]) => any
  clusterBuffer: (...args: stringable[]) => any
  restore: (...args: stringable[]) => any
  restoreBuffer: (...args: stringable[]) => any
  client: (...args: stringable[]) => any
  clientBuffer: (...args: stringable[]) => any
  memory: (subcommand: stringable, key?: stringable) => any
  memoryBuffer: (subcommand: stringable, key?: stringable) => any
  wait: (numreplicas: stringable, timeout: stringable) => any
  waitBuffer: (numreplicas: stringable, timeout: stringable) => any
  // MISC COMMANDS END

  // The proxied event emitter methods
  connect: () => Promise<any>
  disconnect: () => void
  addListener: (event: stringable | symbol, listener: Function) => this
  emit: (event: stringable | symbol, ...args: stringable[]) => boolean
  eventNames: () => (string | symbol)[]
  getMaxListeners: () => number
  listenerCount: (type: stringable | symbol) => number
  listeners: (event: stringable | symbol) => Function[]
  off: (event: stringable | symbol, listener: (...args: stringable[]) => void) => this
  on: (event: stringable | symbol, listener: Function) => this
  once: (event: stringable | symbol, listener: Function) => this
  prependListener: (event: stringable | symbol, listener: Function) => this
  prependOnceListener: (event: stringable | symbol, listener: Function) => this
  rawListeners: (event: stringable | symbol) => Function[]
  removeAllListeners: (event?: stringable | symbol) => this
  removeListener: (event: stringable | symbol, listener: Function) => this
  setMaxListeners: (n: stringable) => this
}

// Dynamically create the redis functions on our prototype
// https://github.com/luin/ioredis/blob/58dc63006fcc98f7a13f363f920856afa887801e/lib/commander.js#L28
const redisCommands = new Set(redisCommandList)
redisCommands.delete('monitor')
redisCommands.add('sentinel')

redisCommandList.forEach(command => {
  RedisLoader.prototype[command] = function (...args) {
    return this.dataLoader.load([command, ...args])
  }
  const bufferCmd = `${command}Buffer`
  RedisLoader.prototype[bufferCmd] = function (...args) {
    return this.dataLoader.load([bufferCmd, ...args])
  }
})

const scanCommands = ['scan', 'sscan', 'hscan', 'zscan', 'scanBuffer', 'sscanBuffer', 'hscanBuffer', 'zscanBuffer']
scanCommands.forEach(command => {
  RedisLoader.prototype[`${command}Stream`] = function (this: RedisLoader, key, options) {
    if (command === 'scan' || command === 'scanBuffer') {
      options = key
      key = null
    }
    return new ScanStream({
      key,
      redis: this,
      command,
      ...options
    })
  }
  RedisLoader.prototype[`${command}Iterable`] = function (this: RedisLoader, key, options) {
    if (command === 'scan' || command === 'scanBuffer') {
      options = key
      key = null
    }
    return scanIterable({
      key,
      redis: this,
      command,
      ...options
    })
  }
})

const pubSubCommands = ['subscribe', 'unsubscribe', 'publish', 'psubscribe', 'punsubscribe']
pubSubCommands.forEach(command => {
  RedisLoader.prototype[command] = function (...args) { return this.redis[command](...args) }
  RedisLoader.prototype[`${command}Buffer`] = function (...args) { return this.redis[`${command}Buffer`](...args) }
})

const passThroughCommands = ['connect', 'disconnect']
passThroughCommands.forEach(command => {
  RedisLoader.prototype[command] = function (...args) { return this.redis[command](...args) }
})

Object.keys(EventEmitter.prototype).forEach(key => {
  if (typeof EventEmitter.prototype[key] === 'function') {
    RedisLoader.prototype[key] = function (...args) {
      return this.redis[key](...args)
    }
  } else {
    Object.defineProperty(RedisLoader.prototype, key, {
      get () {
        return this.redis[key]
      }
    })
  }
})
