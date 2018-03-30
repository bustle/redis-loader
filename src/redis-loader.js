import * as DataLoader from 'dataloader'
import * as invariant from 'invariant'
import { ReadStream } from 'bluestream'

const scanCommands = ['scan', 'sscan', 'hscan', 'zscan', 'scanBuffer', 'sscanBuffer', 'hscanBuffer', 'zscanBuffer']
const pubSubCommands = ['subscribe', 'unsubscribe', 'publish', 'psubscribe', 'punsubscribe']

export default class RedisLoader {
  constructor({ redis, logger = () => {} }) {
    invariant(redis, '"redis" is required')
    this._redis = redis
    this._tripCountTotal = 0
    this._commandCountTotal = 0
    this._timeInRedis = 0
    this._dataLoader = new DataLoader(
      async commands => {
        const start = Date.now()

        const log = () => {
          const end = Date.now()
          const elapsed = end - start
          this._tripCountTotal++
          this._commandCountTotal += commands.length
          this._timeInRedis += elapsed
          this._elapsed = elapsed
          logger(null, this.stats())
        }

        let results
        try {
          results = await redis.multi(commands).exec()
        } catch (err) {
          log()
          if (Array.isArray(err.previousErrors)) {
            err.message = `${err.message} ${err.previousErrors.map(e => e && e.message)}`
          }
          logger(err, this.stats())
          throw err
        }
        log()
        return results.map(([err, data]) => {
          if (err) {
            logger(err, this.stats())
            throw err
          }
          return data
        })
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
      this[command] = (...args) => this._redis[command](...args)
      this[`${command}Buffer`] = (...args) => this._redis[`${command}Buffer`](...args)
    })

    this.on = (...args) => this._redis.on(...args)
  }

  stats() {
    const { _tripCountTotal: tripCountTotal, _commandCountTotal: commandCountTotal, _timeInRedis: timeInRedis, _elapsed: elapsed } = this
    return {
      tripCountTotal,
      commandCountTotal,
      timeInRedis,
      elapsed
    }
  }

  resetStats({ tripCountTotal = 0, commandCountTotal = 0, timeInRedis = 0, elapsed } = {}) {
    this._tripCountTotal = tripCountTotal
    this._commandCountTotal = commandCountTotal
    this._timeInRedis = timeInRedis
    this._elapsed = elapsed
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
