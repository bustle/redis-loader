import { RedisLoader } from './redis-loader'

if ((Symbol as any).asyncIterator === undefined) {
  (Symbol as any).asyncIterator = Symbol.for('asyncIterator')
}

type ScanCommand = 'scan' | 'sscan' | 'hscan' | 'zscan' | 'scanBuffer' | 'sscanBuffer' | 'hscanBuffer' | 'zscanBuffer'
export interface ScanIterableOptions {
  key?: string
  match?: string
  count?: string | number
}

interface FullOptions extends ScanIterableOptions {
  redis: RedisLoader
  command: ScanCommand
}

export async function* scanIterable<T extends (string | Buffer)>({ redis, command, key, match, count }: FullOptions) {
  let nextCursor: string | null = null
  while (nextCursor !== '0') {
    if (nextCursor === null) {
      nextCursor = '0'
    }
    const args: string[] = [nextCursor]
    if (key) {
      args.unshift(key)
    }
    if (match) {
      args.push('MATCH', match)
    }
    if (count) {
      args.push('COUNT', String(count))
    }
    const [cursor, values] = await (redis as any)[command](...args)
    nextCursor = typeof cursor === 'string' ? cursor : cursor.toString()
    yield values as T[]
  }
}
