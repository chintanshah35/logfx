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
    flushInterval = 5000
  } = options

  const maxBufferSize = options.maxBufferSize ?? (batchSize * 10)
  const timeout = options.timeout ?? 30000

  let buffer: LogEntry[] = []
  let flushTimer: ReturnType<typeof setTimeout> | null = null
  let isFlushing = false

  const sendLogs = async (entries: LogEntry[]) => {
    if (entries.length === 0) return

    const body = JSON.stringify(entries.map(entry => JSON.parse(formatJson(entry))))

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
        safeConsole.error(`[logfx:webhook] HTTP ${response.status} ${response.statusText} for ${url}`)
      }
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        safeConsole.error(`[logfx:webhook] Request timeout after ${timeout}ms for ${url}`)
      } else {
        safeConsole.error('[logfx:webhook] Failed to send logs:', getErrorMessage(error))
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
