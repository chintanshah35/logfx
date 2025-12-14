import type { Transport, LogEntry, WebhookTransportOptions } from '../types'
import { formatJson } from '../formatters'

export const webhookTransport = (options: WebhookTransportOptions): Transport => {
  const { 
    url, 
    headers = {}, 
    method = 'POST',
    batchSize = 10,
    flushInterval = 5000
  } = options

  let buffer: LogEntry[] = []
  let flushTimer: ReturnType<typeof setTimeout> | null = null

  const sendLogs = async (entries: LogEntry[]) => {
    if (entries.length === 0) return

    const body = entries.length === 1 
      ? formatJson(entries[0])
      : JSON.stringify(entries.map(entry => JSON.parse(formatJson(entry))))

    try {
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body
      })
    } catch (error) {
      // don't crash the app if webhook fails
      if (typeof process !== 'undefined' && process.env?.DEBUG) {
        console.error('webhook failed:', error)
      }
    }
  }

  const flushBuffer = async () => {
    if (buffer.length === 0) return
    const toSend = buffer
    buffer = []
    await sendLogs(toSend)
  }

  const scheduleFlush = () => {
    if (flushTimer) return
    flushTimer = setTimeout(async () => {
      flushTimer = null
      await flushBuffer()
    }, flushInterval)
  }

  return {
    name: 'webhook',
    log: (entry: LogEntry) => {
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
