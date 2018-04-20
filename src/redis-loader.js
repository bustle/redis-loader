import { EventEmitter } from 'events'
import * as DataLoader from 'dataloader'
import * as invariant from 'invariant'
import { ReadStream } from 'bluestream'

const scanCommands = ['scan', 'sscan', 'hscan', 'zscan', 'scanBuffer', 'sscanBuffer', 'hscanBuffer', 'zscanBuffer']
const pubSubCommands = ['subscribe', 'unsubscribe', 'publish', 'psubscribe', 'punsubscribe']

export default class RedisLoader {
  constructor({ redis, logger = () => {} } = {}) {
    invariant(redis, '"redis" is required')
    this.resetStats()
    this._redis = redis
    this._dataLoader = new DataLoader(
      async commands => {
        const start = Date.now()
        this._stats.commands = commands
        this._stats.sentCommandCount = commands.length
        this._stats.sentCommandCountTotal += commands.length

        const setEndStats = (error, results) => {
          const end = Date.now()
          const timeInRedis = end - start
          this._stats.tripCountTotal++
          this._stats.timeInRedis = timeInRedis
          this._stats.timeInRedisTotal += timeInRedis
          if (error) {
            this._stats.responseCount = 1
            this._stats.responseCountTotal += 1
          } else {
            this._stats.responseCount = results.length
            this._stats.responseCountTotal += results.length
          }
        }

        try {
          const results = await redis.multi(commands).exec()
          setEndStats(null, results)
          const parsedResults = results.map(([err, data]) => {
            if (err) {
              logger(err, this.stats)
              throw err
            }
            return data
          })
          logger(null, this.stats)
          return parsedResults
        } catch (err) {
          setEndStats(err)
          if (Array.isArray(err.previousErrors)) {
            err.message = `${err.message} ${err.previousErrors.map(e => e && e.message)}`
          }
          logger(err, this.stats)
          throw err
        }
      },
      { cache: false }
    )

    redis.getBuiltinCommands().forEach(command => {
      this[command] = (...args) => this._dataLoader.load([command, ...args])
      const bufferCmd = `${command}Buffer`

      if (redis[bufferCmd]) {
        this[bufferCmd] = (...args) => this._dataLoader.load([bufferCmd, ...args])
      }
    })

    scanCommands.forEach(command => {
      this[`${command}Stream`] = (key, options) => {
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

    pubSubCommands.forEach(command => {
      this[command] = (...args) => redis[command](...args)
      this[`${command}Buffer`] = (...args) => redis[`${command}Buffer`](...args)
    })

    Object.keys(EventEmitter.prototype).forEach(key => {
      if (typeof EventEmitter.prototype[key] === 'function') {
        this[key] = (...args) => redis[key](...args)
      } else {
        Object.defineProperty(this, key, { value: redis[key], writable: false })
      }
    })
  }

  get stats() {
    return {
      ...this._stats
    }
  }

  resetStats({
    tripCountTotal = 0,
    commands = null,
    sentCommandCount = 0,
    sentCommandCountTotal = 0,
    responseCount = 0,
    responseCountTotal = 0,
    timeInRedis = 0,
    timeInRedisTotal = 0
  } = {}) {
    this._stats = {
      tripCountTotal,
      commands,
      sentCommandCount,
      responseCount,
      sentCommandCountTotal,
      responseCountTotal,
      timeInRedis,
      timeInRedisTotal
    }
  }
}

class ScanStream extends ReadStream {
  constructor(opts = {}) {
    invariant(opts.redis, '"opts.redis" is required')
    super(opts)
    this._redis = opts.redis
    this._command = opts.command
    this._opts = opts
    this._nextCursor = '0'
  }

  async _read() {
    const { _opts } = this
    const args = [this._nextCursor]
    if (_opts.key) {
      args.unshift(_opts.key)
    }
    if (_opts.match) {
      args.push('MATCH', _opts.match)
    }
    if (_opts.count) {
      args.push('COUNT', _opts.count)
    }

    const [nextCursor, redisIds] = await this._redis[this._command](args)
    this._nextCursor = nextCursor instanceof Buffer ? nextCursor.toString() : nextCursor
    this.push(redisIds)
    if (this._nextCursor === '0') {
      this.push(null)
    }
  }
}
