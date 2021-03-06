function startTimer() {
  return process.hrtime()
}

const nsInMs = 1e6
const msInS = 1e3
/**
 * Returns a float of ms and nano seconds max duration is about 104 days
 */
function endTimer(start: [number, number]) {
  const [seconds, nanoseconds] = process.hrtime(start)
  return seconds * msInS + nanoseconds / nsInMs
}

export class BatchStats {
  public readonly commands: Array<any>
  public readonly start: [number, number]
  public readonly multi: boolean
  public duration: number | null
  public response: Array<any> | null
  public error: Error|null

  constructor({ commands, start = startTimer(), multi }: { commands: string[][], start?: [number, number], multi: boolean, }) {
    this.start = start
    this.commands = commands
    this.multi = multi
    this.duration = null
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
    return this.duration || endTimer(this.start)
  }

  finish(error: Error|null, response: Array<any>) {
    this.duration = endTimer(this.start)
    this.error = error
    this.response = response
  }
}

export class RedisStats {
  public readonly batches: Set<BatchStats>
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

  startBatch(batchInfo) {
    const batch = new BatchStats(batchInfo)
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

  toJSON() {
    const {
      batches,
      batchCount,
      commandCount,
      responseCount,
      timeInRedis,
      lastBatch
    } = this
    return {
      batches: Array.from(batches),
      batchCount,
      commandCount,
      responseCount,
      timeInRedis,
      lastBatch
    }
  }
}
