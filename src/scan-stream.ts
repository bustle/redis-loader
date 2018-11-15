import { Redis } from 'ioredis'
import { ReadStream, IReadableStreamOptions } from 'bluestream'

export interface ScanStreamOptions {
  key?: string
  match?: string
  count?: string | number
}

interface ScanStreamConstructorOptions extends IReadableStreamOptions, ScanStreamOptions {
  redis: Redis
  command: 'scan' | 'sscan' | 'hscan' | 'zscan' | 'scanBuffer' | 'sscanBuffer' | 'hscanBuffer' | 'zscanBuffer'
}

// Bluestream based scan streams
export class ScanStream extends ReadStream {
  private _redis: Redis
  private _command: string
  private _opts: IReadableStreamOptions
  private _nextCursor: string
  private _key: string | undefined
  private _match: string | undefined
  private _count: string | undefined

  constructor({ redis, command, key, match, count, ...opts }: ScanStreamConstructorOptions) {
    super(opts)
    this._redis = redis
    this._command = command
    this._opts = opts
    this._nextCursor = '0'
    this._key = key
    this._match = match
    this._count = count ? String(count) : undefined
  }

  async _read() {
    const { _key, _match, _count } = this
    const args = [this._nextCursor]
    if (_key) {
      args.unshift(_key)
    }
    if (_match) {
      args.push('MATCH', _match)
    }
    if (_count) {
      args.push('COUNT', _count)
    }

    const [nextCursor, redisIds] = await this._redis[this._command](args)
    this._nextCursor = nextCursor instanceof Buffer ? nextCursor.toString() : nextCursor
    this.push(redisIds)
    if (this._nextCursor === '0') {
      this.push(null)
    }
  }
}
