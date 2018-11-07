import { EventEmitter } from 'events'
import * as DataLoader from 'dataloader'
import * as invariant from 'invariant'
import { list as redisCommandList } from 'redis-commands'
import { ScanStream, ScanStreamOptions } from './scan-stream'
import { Redis } from 'ioredis'
import { RedisStats, BatchStats } from './stats'

export { BatchStats }
export type statsLogger = (stats: RedisStats) => void

export interface IRedisLoaderOptions {
  redis: Redis
  logger?: statsLogger
  maxBatchSize?: number
}

export class RedisLoader implements EventEmitter {
  public stats: RedisStats
  public redis: Redis
  private logger: statsLogger | undefined
  private dataLoader: DataLoader<{}, {}>

  constructor({ redis, logger, maxBatchSize = Infinity }: IRedisLoaderOptions) {
    invariant(redis, '"redis" is required')
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

  batchFunction(commands: string[][]) : Promise<any> {
    invariant(commands && commands.length > 0, 'no commands to run')
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
  connect: () => Promise<any>;
  disconnect: () => void;
  bitcount: (key: string, start?: number, end?: number) => Promise<number>;
  bitcountBuffer: (key: string, start?: number, end?: number) => Promise<number>;
  get: (key: string) => Promise<string>;
  getBuffer: (key: string) => Promise<string>;
  set: (key: string, value: any, ...args: any[]) => any;
  setBuffer: (key: string, value: any, ...args: any[]) => any;
  setnx: (key: string, value: any) => Promise<any>;
  setnxBuffer: (key: string, value: any) => Promise<any>;
  setex: (key: string, seconds: number, value: any) => Promise<any>;
  setexBuffer: (key: string, seconds: number, value: any) => Promise<any>;
  psetex: (key: string, milliseconds: number, value: any) => Promise<any>;
  psetexBuffer: (key: string, milliseconds: number, value: any) => Promise<any>;
  append: (key: string, value: any) => Promise<number>;
  appendBuffer: (key: string, value: any) => Promise<number>;
  strlen: (key: string) => Promise<number>;
  strlenBuffer: (key: string) => Promise<number>;
  del: (...keys: string[]) => any;
  delBuffer: (...keys: string[]) => any;
  exists: (...keys: string[]) => any;
  existsBuffer: (...keys: string[]) => any;
  setbit: (key: string, offset: number, value: any) => Promise<number>;
  setbitBuffer: (key: string, offset: number, value: any) => Promise<number>;
  getbit: (key: string, offset: number) => Promise<number>;
  getbitBuffer: (key: string, offset: number) => Promise<number>;
  setrange: (key: string, offset: number, value: any) => Promise<number>;
  setrangeBuffer: (key: string, offset: number, value: any) => Promise<number>;
  getrange: (key: string, start: number, end: number) => Promise<string>;
  getrangeBuffer: (key: string, start: number, end: number) => Promise<string>;
  substr: (key: string, start: number, end: number) => Promise<string>;
  substrBuffer: (key: string, start: number, end: number) => Promise<string>;
  incr: (key: string) => Promise<number>;
  incrBuffer: (key: string) => Promise<number>;
  decr: (key: string) => Promise<number>;
  decrBuffer: (key: string) => Promise<number>;
  mget: (...keys: string[]) => any;
  mgetBuffer: (...keys: string[]) => any;
  rpush: (key: string, ...values: any[]) => any;
  rpushBuffer: (key: string, ...values: any[]) => any;
  lpush: (key: string, ...values: any[]) => any;
  lpushBuffer: (key: string, ...values: any[]) => any;
  rpushx: (key: string, value: any) => Promise<number>;
  rpushxBuffer: (key: string, value: any) => Promise<number>;
  lpushx: (key: string, value: any) => Promise<number>;
  lpushxBuffer: (key: string, value: any) => Promise<number>;
  linsert: (key: string, direction: "BEFORE" | "AFTER", pivot: string, value: any) => Promise<number>;
  linsertBuffer: (key: string, direction: "BEFORE" | "AFTER", pivot: string, value: any) => Promise<number>;
  rpop: (key: string) => Promise<string>;
  rpopBuffer: (key: string) => Promise<string>;
  lpop: (key: string) => Promise<string>;
  lpopBuffer: (key: string) => Promise<string>;
  brpop: (...keys: string[]) => any;
  brpopBuffer: (...keys: string[]) => any;
  blpop: (...keys: string[]) => any;
  blpopBuffer: (...keys: string[]) => any;
  brpoplpush: (source: string, destination: string, timeout: number) => Promise<any>;
  brpoplpushBuffer: (source: string, destination: string, timeout: number) => Promise<any>;
  llen: (key: string) => Promise<number>;
  llenBuffer: (key: string) => Promise<number>;
  lindex: (key: string, index: number) => Promise<string>;
  lindexBuffer: (key: string, index: number) => Promise<string>;
  lset: (key: string, index: number, value: any) => Promise<any>;
  lsetBuffer: (key: string, index: number, value: any) => Promise<any>;
  lrange: (key: string, start: number, stop: number) => Promise<any>;
  lrangeBuffer: (key: string, start: number, stop: number) => Promise<any>;
  ltrim: (key: string, start: number, stop: number) => Promise<any>;
  ltrimBuffer: (key: string, start: number, stop: number) => Promise<any>;
  lrem: (key: string, count: number, value: any) => Promise<number>;
  lremBuffer: (key: string, count: number, value: any) => Promise<number>;
  rpoplpush: (source: string, destination: string) => Promise<string>;
  rpoplpushBuffer: (source: string, destination: string) => Promise<string>;
  sadd: (key: string, ...members: any[]) => any;
  saddBuffer: (key: string, ...members: any[]) => any;
  srem: (key: string, ...members: any[]) => any;
  sremBuffer: (key: string, ...members: any[]) => any;
  smove: (source: string, destination: string, member: string) => Promise<string>;
  smoveBuffer: (source: string, destination: string, member: string) => Promise<string>;
  sismember: (key: string, member: string) => Promise<1 | 0>;
  sismemberBuffer: (key: string, member: string) => Promise<1 | 0>;
  scard: (key: string) => Promise<number>;
  scardBuffer: (key: string) => Promise<number>;
  spop: (key: string, count?: number) => Promise<any>;
  spopBuffer: (key: string, count?: number) => Promise<any>;
  srandmember: (key: string, count?: number) => Promise<any>;
  srandmemberBuffer: (key: string, count?: number) => Promise<any>;
  sinter: (...keys: string[]) => any;
  sinterBuffer: (...keys: string[]) => any;
  sinterstore: (destination: string, ...keys: string[]) => any;
  sinterstoreBuffer: (destination: string, ...keys: string[]) => any;
  sunion: (...keys: string[]) => any;
  sunionBuffer: (...keys: string[]) => any;
  sunionstore: (destination: string, ...keys: string[]) => any;
  sunionstoreBuffer: (destination: string, ...keys: string[]) => any;
  sdiff: (...keys: string[]) => any;
  sdiffBuffer: (...keys: string[]) => any;
  sdiffstore: (destination: string, ...keys: string[]) => any;
  sdiffstoreBuffer: (destination: string, ...keys: string[]) => any;
  smembers: (key: string) => Promise<any>;
  smembersBuffer: (key: string) => Promise<any>;
  zadd: (key: string, ...args: string[]) => any;
  zaddBuffer: (key: string, ...args: string[]) => any;
  zincrby: (key: string, increment: number, member: string) => Promise<any>;
  zincrbyBuffer: (key: string, increment: number, member: string) => Promise<any>;
  zrem: (key: string, ...members: any[]) => any;
  zremBuffer: (key: string, ...members: any[]) => any;
  zremrangebyscore: (key: string, min: number | string, max: number | string) => Promise<any>;
  zremrangebyscoreBuffer: (key: string, min: number | string, max: number | string) => Promise<any>;
  zremrangebyrank: (key: string, start: number, stop: number) => Promise<any>;
  zremrangebyrankBuffer: (key: string, start: number, stop: number) => Promise<any>;
  zunionstore: (destination: string, numkeys: number, key: string, ...args: string[]) => any;
  zunionstoreBuffer: (destination: string, numkeys: number, key: string, ...args: string[]) => any;
  zinterstore: (destination: string, numkeys: number, key: string, ...args: string[]) => any;
  zinterstoreBuffer: (destination: string, numkeys: number, key: string, ...args: string[]) => any;
  zrange: (key: string, start: number, stop: number, withScores?: "WITHSCORES") => Promise<any>;
  zrangeBuffer: (key: string, start: number, stop: number, withScores?: "WITHSCORES") => Promise<any>;
  zrevrange: (key: string, start: number, stop: number, withScores?: "WITHSCORES") => Promise<any>;
  zrevrangeBuffer: (key: string, start: number, stop: number, withScores?: "WITHSCORES") => Promise<any>;
  zrangebyscore: (key: string, min: number | string, max: number | string, ...args: string[]) => any;
  zrangebyscoreBuffer: (key: string, min: number | string, max: number | string, ...args: string[]) => any;
  zrevrangebyscore: (key: string, max: number | string, min: number | string, ...args: string[]) => any;
  zrevrangebyscoreBuffer: (key: string, max: number | string, min: number | string, ...args: string[]) => any;
  zcount: (key: string, min: number | string, max: number | string) => Promise<number>;
  zcountBuffer: (key: string, min: number | string, max: number | string) => Promise<number>;
  zcard: (key: string) => Promise<number>;
  zcardBuffer: (key: string) => Promise<number>;
  zscore: (key: string, member: string) => Promise<number>;
  zscoreBuffer: (key: string, member: string) => Promise<number>;
  zrank: (key: string, member: string) => Promise<number>;
  zrankBuffer: (key: string, member: string) => Promise<number>;
  zrevrank: (key: string, member: string) => Promise<number>;
  zrevrankBuffer: (key: string, member: string) => Promise<number>;
  zpopmax: (key: string, count?: number) => any;
  zpopmaxBuffer: (key: string, count?: number) => any;
  bzpopmax: (key: string, ...keysOrTimeout: Array<string | number>) => any;
  bzpopmaxBuffer: (key: string, ...keysOrTimeout: Array<string | number>) => any;
  zpopmin: (key: string, count?: number) => any;
  zpopminBuffer: (key: string, count?: number) => any;
  bzpopmin: (key: string, ...keysOrTimeout: Array<string | number>) => any;
  bzpopminBuffer: (key: string, ...keysOrTimeout: Array<string | number>) => any;
  hset: (key: string, field: string, value: any) => Promise<0 | 1>;
  hsetBuffer: (key: string, field: string, value: any) => Promise<0 | 1>;
  hsetnx: (key: string, field: string, value: any) => Promise<0 | 1>;
  hsetnxBuffer: (key: string, field: string, value: any) => Promise<0 | 1>;
  hget: (key: string, field: string) => Promise<string>;
  hgetBuffer: (key: string, field: string) => Promise<string>;
  hmset: (key: string, fieldOrObj: string|object, value?: any, ...args: string[]) => Promise<0 | 1>;
  hmsetBuffer: (key: string, fieldOrObj: string|object, value?: any, ...args: string[]) => Promise<0 | 1>;
  hmget: (key: string, ...fields: string[]) => any;
  hmgetBuffer: (key: string, ...fields: string[]) => any;
  hincrby: (key: string, field: string, increment: number) => Promise<number>;
  hincrbyBuffer: (key: string, field: string, increment: number) => Promise<number>;
  hincrbyfloat: (key: string, field: string, increment: number) => Promise<number>;
  hincrbyfloatBuffer: (key: string, field: string, increment: number) => Promise<number>;
  hdel: (key: string, ...fields: string[]) => any;
  hdelBuffer: (key: string, ...fields: string[]) => any;
  hlen: (key: string) => Promise<number>;
  hlenBuffer: (key: string) => Promise<number>;
  hkeys: (key: string) => Promise<any>;
  hkeysBuffer: (key: string) => Promise<any>;
  hvals: (key: string) => Promise<any>;
  hvalsBuffer: (key: string) => Promise<any>;
  hgetall: (key: string) => Promise<any>;
  hgetallBuffer: (key: string) => Promise<any>;
  hexists: (key: string, field: string) => Promise<0 | 1>;
  hexistsBuffer: (key: string, field: string) => Promise<0 | 1>;
  incrby: (key: string, increment: number) => Promise<number>;
  incrbyBuffer: (key: string, increment: number) => Promise<number>;
  incrbyfloat: (key: string, increment: number) => Promise<number>;
  incrbyfloatBuffer: (key: string, increment: number) => Promise<number>;
  decrby: (key: string, decrement: number) => Promise<number>;
  decrbyBuffer: (key: string, decrement: number) => Promise<number>;
  getset: (key: string, value: any) => Promise<string>;
  getsetBuffer: (key: string, value: any) => Promise<string>;
  mset: (key: string, value: any, ...args: string[]) => any;
  msetBuffer: (key: string, value: any, ...args: string[]) => any;
  msetnx: (key: string, value: any, ...args: string[]) => any;
  msetnxBuffer: (key: string, value: any, ...args: string[]) => any;
  randomkey: () => Promise<string>;
  randomkeyBuffer: () => Promise<string>;
  select: (index: number) => Promise<string>;
  selectBuffer: (index: number) => Promise<string>;
  move: (key: string, db: string) => Promise<0 | 1>;
  moveBuffer: (key: string, db: string) => Promise<0 | 1>;
  rename: (key: string, newkey: string) => Promise<string>;
  renameBuffer: (key: string, newkey: string) => Promise<string>;
  renamenx: (key: string, newkey: string) => Promise<0 | 1>;
  renamenxBuffer: (key: string, newkey: string) => Promise<0 | 1>;
  expire: (key: string, seconds: number) => Promise<0 | 1>;
  expireBuffer: (key: string, seconds: number) => Promise<0 | 1>;
  pexpire: (key: string, milliseconds: number) => Promise<0 | 1>;
  pexpireBuffer: (key: string, milliseconds: number) => Promise<0 | 1>;
  expireat: (key: string, timestamp: number) => Promise<0 | 1>;
  expireatBuffer: (key: string, timestamp: number) => Promise<0 | 1>;
  pexpireat: (key: string, millisecondsTimestamp: number) => Promise<0 | 1>;
  pexpireatBuffer: (key: string, millisecondsTimestamp: number) => Promise<0 | 1>;
  keys: (pattern: string) => Promise<string[]>;
  keysBuffer: (pattern: string) => Promise<string[]>;
  dbsize: () => Promise<number>;
  dbsizeBuffer: () => Promise<number>;
  auth: (password: string) => Promise<string>;
  authBuffer: (password: string) => Promise<string>;
  ping: (message?: string) => Promise<string>;
  pingBuffer: (message?: string) => Promise<string>;
  echo: (message: string) => Promise<string>;
  echoBuffer: (message: string) => Promise<string>;
  save: () => Promise<string>;
  saveBuffer: () => Promise<string>;
  bgsave: () => Promise<string>;
  bgsaveBuffer: () => Promise<string>;
  bgrewriteaof: () => Promise<string>;
  bgrewriteaofBuffer: () => Promise<string>;
  shutdown: (save: "SAVE" | "NOSAVE") => Promise<any>;
  shutdownBuffer: (save: "SAVE" | "NOSAVE") => Promise<any>;
  lastsave: () => Promise<number>;
  lastsaveBuffer: () => Promise<number>;
  type: (key: string) => Promise<string>;
  typeBuffer: (key: string) => Promise<string>;
  exec: () => Promise<any>;
  execBuffer: () => Promise<any>;
  discard: () => Promise<any>;
  discardBuffer: () => Promise<any>;
  sync: () => Promise<any>;
  syncBuffer: () => Promise<any>;
  flushdb: () => Promise<string>;
  flushdbBuffer: () => Promise<string>;
  flushall: () => Promise<string>;
  flushallBuffer: () => Promise<string>;
  sort: (key: string, ...args: string[]) => any;
  sortBuffer: (key: string, ...args: string[]) => any;
  info: (section?: string) => Promise<string>;
  infoBuffer: (section?: string) => Promise<string>;
  time: () => Promise<any>;
  timeBuffer: () => Promise<any>;
  ttl: (key: string) => Promise<number>;
  ttlBuffer: (key: string) => Promise<number>;
  persist: (key: string) => Promise<0 | 1>;
  persistBuffer: (key: string) => Promise<0 | 1>;
  slaveof: (host: string, port: number) => Promise<string>;
  slaveofBuffer: (host: string, port: number) => Promise<string>;
  debug: (...args: any[]) => any;
  debugBuffer: (...args: any[]) => any;
  config: (...args: any[]) => any;
  configBuffer: (...args: any[]) => any;
  subscribe: (...channels: any[]) => any;
  subscribeBuffer: (...channels: any[]) => any;
  unsubscribe: (...channels: string[]) => any;
  unsubscribeBuffer: (...channels: string[]) => any;
  psubscribe: (...patterns: string[]) => any;
  psubscribeBuffer: (...patterns: string[]) => any;
  punsubscribe: (...patterns: string[]) => any;
  punsubscribeBuffer: (...patterns: string[]) => any;
  publish: (channel: string, message: string) => Promise<number>;
  publishBuffer: (channel: string, message: string) => Promise<number>;
  watch: (...keys: string[]) => any;
  watchBuffer: (...keys: string[]) => any;
  unwatch: () => Promise<string>;
  unwatchBuffer: () => Promise<string>;
  cluster: (...args: any[]) => any;
  clusterBuffer: (...args: any[]) => any;
  restore: (...args: any[]) => any;
  restoreBuffer: (...args: any[]) => any;
  migrate: (...args: any[]) => any;
  migrateBuffer: (...args: any[]) => any;
  dump: (key: string) => Promise<string>;
  dumpBuffer: (key: string) => Promise<string>;
  object: (subcommand: string, ...args: any[]) => any;
  objectBuffer: (subcommand: string, ...args: any[]) => any;
  client: (...args: any[]) => any;
  clientBuffer: (...args: any[]) => any;
  eval: (...args: any[]) => any;
  evalBuffer: (...args: any[]) => any;
  evalsha: (...args: any[]) => any;
  evalshaBuffer: (...args: any[]) => any;
  script: (...args: any[]) => any;
  scriptBuffer: (...args: any[]) => any;
  quit: () => Promise<string>;
  quitBuffer: () => Promise<string>;
  scan: (cursor: number, ...args: any[]) => any;
  scanBuffer: (cursor: number, ...args: any[]) => any;
  hscan: (key: string, cursor: number, ...args: any[]) => any;
  hscanBuffer: (key: string, cursor: number, ...args: any[]) => any;
  zscan: (key: string, cursor: number, ...args: any[]) => any;
  zscanBuffer: (key: string, cursor: number, ...args: any[]) => any;
  pfmerge: (destkey: string, ...sourcekeys: string[]) => any;
  pfmergeBuffer: (destkey: string, ...sourcekeys: string[]) => any;
  pfadd: (key: string, ...elements: string[]) => any;
  pfaddBuffer: (key: string, ...elements: string[]) => any;
  pfcount: (...keys: string[]) => any;
  pfcountBuffer: (...keys: string[]) => any;
  memory: (subcommand: string, key?: string) => any;
  memoryBuffer: (subcommand: string, key?: string) => any;

  // Redis Streams
  xack: (key: string, group: string, ...ids: Array<string | number>) => any;
  xackBuffer: (key: string, group: string, ...ids: Array<string | number>) => any;
  xadd: (key: string, id: string | number, ...fieldAndString: Array<string>) => any;
  xaddBuffer: (key: string, id: string | number, ...fieldAndString: Array<string>) => any;
  xclaim: (...args: Array<string | number>) => any;
  xclaimBuffer: (...args: Array<string | number>) => any;
  xdel: (key: string, ...ids: Array<string | number>) => any;
  xdelBuffer: (key: string, ...ids: Array<string | number>) => any;
  xgroup: (...args: Array<string | number>) => any;
  xgroupBuffer: (...args: Array<string | number>) => any;
  xinfo: (...args: Array<string | number>) => any;
  xinfoBuffer: (...args: Array<string | number>) => any;
  xlen: (key: string) => any;
  xlenBuffer: (key: string) => any;
  xpending: (key: string, group: string, ...args: Array<string | number>) => any;
  xpendingBuffer: (key: string, group: string, ...args: Array<string | number>) => any;
  xrange: (key: string, start: string, end: string, COUNT?: "COUNT", count?: string | number) => any;
  xrangeBuffer: (key: string, start: string, end: string, COUNT?: "COUNT", count?: string | number) => any;
  xread: (...args: Array<string | number>) => any;
  xreadBuffer: (...args: Array<string | number>) => any;
  xreadgroup: (...args: Array<string | number>) => any;
  xreadgroupBuffer: (...args: Array<string | number>) => any;
  xrevrange: (key: string, start: string, end: string, COUNT?: "COUNT", count?: string | number) => any;
  xrevrangeBuffer: (key: string, start: string, end: string, COUNT?: "COUNT", count?: string | number) => any;
  xtrim: (key: string, MAXLEN: "MAXLEN", tilde?: "~", count?: string | number) => any;
  xtrimBuffer: (key: string, MAXLEN: "MAXLEN", tilde?: "~", count?: string | number) => any;

  // Node Streams
  scanStream: (options?: ScanStreamOptions) => ScanStream;
  scanStreamBuffer: (options?: ScanStreamOptions) => ScanStream;
  sscanStream: (options?: ScanStreamOptions) => ScanStream;
  sscanStreamBuffer: (options?: ScanStreamOptions) => ScanStream;
  hscanStream: (key: string, options?: ScanStreamOptions) => ScanStream;
  hscanStreamBuffer: (key: string, options?: ScanStreamOptions) => ScanStream;
  zscanStream: (key: string, options?: ScanStreamOptions) => ScanStream;
  zscanStreamBuffer: (key: string, options?: ScanStreamOptions) => ScanStream;

  // The proxied event emitter methods
  addListener: (event: string | symbol, listener: Function) => this;
  emit: (event: string | symbol, ...args: any[]) => boolean;
  eventNames: () => (string | symbol)[];
  getMaxListeners: () => number;
  listenerCount: (type: string | symbol) => number;
  listeners: (event: string | symbol) => Function[];
  off: (event: string | symbol, listener: (...args: any[]) => void) => this;
  on: (event: string | symbol, listener: Function) => this;
  once: (event: string | symbol, listener: Function) => this;
  prependListener: (event: string | symbol, listener: Function) => this;
  prependOnceListener: (event: string | symbol, listener: Function) => this;
  rawListeners: (event: string | symbol) => Function[]
  removeAllListeners: (event?: string | symbol) => this;
  removeListener: (event: string | symbol, listener: Function) => this;
  setMaxListeners: (n: number) => this;
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
  RedisLoader.prototype[`${command}Stream`] = function (key, options) {
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
