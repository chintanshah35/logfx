import type { LogEntry, Transport } from './types'
import { safeConsole } from './console'
import { getErrorMessage } from './utils'

export class LogBuffer {
  private buffer: LogEntry[] = []
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private transports: Transport[]
  private maxSize: number
  private flushInterval: number
  private isFlushing = false
  private flushPromise: Promise<void> | null = null

  constructor(
    transports: Transport[],
    maxSize = 100,
    flushInterval = 5000
  ) {
    this.transports = transports
    this.maxSize = maxSize
    this.flushInterval = flushInterval
    
    if (flushInterval > 0) {
      this.startFlushTimer()
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.flushInterval)
    
    // Don't block process exit
    if (this.flushTimer.unref) {
      this.flushTimer.unref()
    }
  }

  add(entry: LogEntry): void {
    this.buffer.push(entry)
    
    if (this.buffer.length >= this.maxSize && !this.isFlushing) {
      this.flush()
    }
  }

  async flush(): Promise<void> {
    if (this.isFlushing) {
      return this.flushPromise ?? Promise.resolve()
    }
    
    if (this.buffer.length === 0) {
      return Promise.resolve()
    }
    
    this.isFlushing = true
    this.flushPromise = (async () => {
      try {
        // Atomic operation: splice removes and returns entries atomically
        const entries = this.buffer.splice(0, this.buffer.length)
        
        for (const entry of entries) {
          for (const transport of this.transports) {
            try {
              const result = transport.log(entry)
              if (result instanceof Promise) {
                await result
              }
            } catch (error) {
              safeConsole.error(`[logfx:buffer] Transport ${transport.name} failed:`, getErrorMessage(error))
            }
          }
        }
      } finally {
        this.isFlushing = false
        this.flushPromise = null
      }
    })()
    
    return this.flushPromise
  }

  async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    
    await this.flush()
    
    for (const transport of this.transports) {
      if (transport.close) {
        try {
          await transport.close()
        } catch (error) {
          safeConsole.error(`[logfx:buffer] Transport ${transport.name} close failed:`, getErrorMessage(error))
        }
      }
    }
  }

  get size(): number {
    return this.buffer.length
  }
}
