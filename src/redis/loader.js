import DataLoader from 'dataloader'
import invariant from 'invariant'

import { ReadStream } from 'bluestream'

export default class RedisLoader {
  constructor({ redis }) {
    invariant(redis, '"redis" is required')
    this._redis = redis
    this._tripCountTotal = 0
    this._commandCountTotal = 0
    this._timeInRedis = 0
    this._dataLoader = new DataLoader(
      async commands => {
        const start = Date.now()

        const log = () => {
          const commandCount = commands.length
          const end = Date.now()
          const elapsed = end - start
          this._tripCountTotal++
          this._commandCountTotal += commands.length
          this._timeInRedis += elapsed
        }

        let results
        try {
          results = await redis.multi(commands).exec()
        } catch (error) {
          log()
          if (Array.isArray(error.previousErrors)) {
            error.message = `${error.message} ${error.previousErrors.map(e => e && e.message)}`
          }
          throw error
        }
        log()
        return results.map(([err, data]) => {
          if (err) {
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

    const scanCommands = ['scan', 'sscan', 'hscan', 'zscan', 'scanBuffer', 'sscanBuffer', 'hscanBuffer', 'zscanBuffer']
    scanCommands.forEach(command => {
      this[command + 'Stream'] = (key, options) => {
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
  }

  stats() {
    const { _tripCountTotal: tripCountTotal, _commandCountTotal: commandCountTotal, _timeInRedis: timeInRedis } = this
    return {
      tripCountTotal,
      commandCountTotal,
      timeInRedis
    }
  }

  resetStats({ tripCountTotal = 0, commandCountTotal = 0, timeInRedis = 0 } = {}) {
    this._tripCountTotal = tripCountTotal
    this._commandCountTotal = commandCountTotal
    this._timeInRedis = timeInRedis
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
