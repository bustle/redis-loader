import { EventEmitter } from 'events'
import * as invariant from 'invariant'
import { list as redisCommandList } from 'redis-commands'
import { ScanStream } from './scan-stream'
import { Redis } from 'ioredis'
import { redisMethods } from './interfaces'

export class BatchStats {
  public commands: Array<any>
  public start: number;
  public end: number|null;
  public response: Array<any>
  public error: Error|null

  constructor({ commands, start = Date.now() }) {
    this.start = start
    this.end = null
    this.commands = commands
    this.response = null
    this.error = null
  }

  get commandCount () {
    return this.commands.length
  }

  get responseCount () {
    return (this.response || []).length
  }

  get timeInRedis () {
    const end = this.end || Date.now()
    return end - this.start
  }

  finish(error: Error|null, response: Array<any>) {
    this.end = Date.now()
    this.error = error
    this.response = response
  }
}

export class RedisStats {
  public batches: Set<BatchStats>
  public batchCount: number
  public commandCount: number
  public responseCount: number
  public timeInRedis: number
  public lastBatch: BatchStats | null

  constructor() {
    this.batches = new Set()
    this.batchCount = 0
    this.commandCount = 0
    this.responseCount = 0
    this.timeInRedis = 0
    this.lastBatch = null
  }

  startBatch(commands) {
    const batch = new BatchStats({ commands })
    this.batches.add(batch)
    this.batchCount++
    this.commandCount += batch.commandCount
    return batch
  }

  endBatch(batch: BatchStats, error: Error|null, response: Array<any>) {
    batch.finish(error, response)
    this.timeInRedis += batch.timeInRedis
    this.responseCount += batch.responseCount
    this.lastBatch = batch
    this.batches.delete(batch)
  }
}
