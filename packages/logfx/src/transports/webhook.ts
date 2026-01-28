import type { Transport, LogEntry, WebhookTransportOptions } from '../types'
import { formatJson } from '../formatters'
import { safeConsole } from '../console'
import { getErrorMessage } from '../utils'

export const webhookTransport = (options: WebhookTransportOptions): Transport => {
  const { 
    url, 
    headers = {}, 
    method = 'POST',
    batchSize = 10,
    flushInterval = 5000,
    retry
  } = options

  const maxBufferSize = options.maxBufferSize ?? (batchSize * 10)
  const timeout = options.timeout ?? 30000

  const retryConfig = {
    maxRetries: retry?.maxRetries ?? 3,
    initialDelay: retry?.initialDelay ?? 1000,
    maxDelay: retry?.maxDelay ?? 30000,
    backoff: retry?.backoff ?? 'exponential' as const,
    retryOn: retry?.retryOn ?? [500, 502, 503, 504, 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND']
  }

  let buffer: LogEntry[] = []
  let flushTimer: ReturnType<typeof setTimeout> | null = null
  let isFlushing = false

  const shouldRetry = (error: unknown, statusCode?: number): boolean => {
    if (statusCode && retryConfig.retryOn.includes(statusCode)) {
      return true
    }
    
    if (error instanceof Error) {
      const errorCode = (error as NodeJS.ErrnoException).code
      if (errorCode && retryConfig.retryOn.includes(errorCode)) {
        return true
      }
      if (error.name === 'AbortError' && retryConfig.retryOn.includes('ETIMEDOUT')) {
        return true
      }
    }
    
    return false
  }

  const calculateDelay = (attempt: number): number => {
    let delay: number
    
    switch (retryConfig.backoff) {
      case 'exponential':
        delay = retryConfig.initialDelay * Math.pow(2, attempt)
        break
      case 'linear':
        delay = retryConfig.initialDelay * (attempt + 1)
        break
      case 'fixed':
      default:
        delay = retryConfig.initialDelay
    }
    
    return Math.min(delay, retryConfig.maxDelay)
  }

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const sendLogs = async (entries: LogEntry[]) => {
    if (entries.length === 0) return

    const body = JSON.stringify(entries.map(entry => JSON.parse(formatJson(entry))))

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      try {
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', ...headers },
          body,
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          if (shouldRetry(null, response.status) && attempt < retryConfig.maxRetries) {
            const delay = calculateDelay(attempt)
            safeConsole.warn(`[logfx:webhook] HTTP ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${retryConfig.maxRetries})`)
            await sleep(delay)
            continue
          }
          
          safeConsole.error(`[logfx:webhook] HTTP ${response.status} ${response.statusText} for ${url}`)
        }
        
        return
      } catch (error) {
        clearTimeout(timeoutId)
        
        if (shouldRetry(error) && attempt < retryConfig.maxRetries) {
          const delay = calculateDelay(attempt)
          const errorMsg = error instanceof Error && error.name === 'AbortError' 
            ? 'timeout' 
            : getErrorMessage(error)
          safeConsole.warn(`[logfx:webhook] ${errorMsg}, retrying in ${delay}ms (attempt ${attempt + 1}/${retryConfig.maxRetries})`)
          await sleep(delay)
          continue
        }
        
        if (error instanceof Error && error.name === 'AbortError') {
          safeConsole.error(`[logfx:webhook] Request timeout after ${timeout}ms for ${url}`)
        } else {
          safeConsole.error('[logfx:webhook] Failed to send logs:', getErrorMessage(error))
        }
        
        return
      }
    }
  }

  const flushBuffer = async () => {
    if (buffer.length === 0 || isFlushing) return
    
    isFlushing = true
    try {
      // Atomic operation: splice removes and returns entries atomically
      const toSend = buffer.splice(0, buffer.length)
      if (toSend.length > 0) {
        await sendLogs(toSend)
      }
    } finally {
      isFlushing = false
    }
  }

  const scheduleFlush = () => {
    if (flushTimer) return
    flushTimer = setTimeout(async () => {
      flushTimer = null
      await flushBuffer()
    }, flushInterval)
    
    if (flushTimer && typeof flushTimer.unref === 'function') {
      flushTimer.unref()
    }
  }

  return {
    name: 'webhook',
    log: (entry: LogEntry) => {
      if (buffer.length >= maxBufferSize) {
        buffer.shift()
        safeConsole.warn(`[logfx:webhook] Buffer full, dropping oldest log. Consider increasing maxBufferSize or batchSize.`)
      }
      
      buffer.push(entry)
      
      if (buffer.length >= batchSize) {
        flushBuffer()
      } else {
        scheduleFlush()
      }
    },
    flush: async () => {
      if (flushTimer) {
        clearTimeout(flushTimer)
        flushTimer = null
      }
      await flushBuffer()
    },
    close: async () => {
      if (flushTimer) {
        clearTimeout(flushTimer)
        flushTimer = null
      }
      await flushBuffer()
    }
  }
}
