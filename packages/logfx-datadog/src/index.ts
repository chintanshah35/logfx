import type { Transport, LogEntry } from 'logfx'

export interface DatadogTransportOptions {
  apiKey: string
  service: string
  host?: string
  tags?: string[]
  source?: string
  hostname?: string
}

export const datadogTransport = (options: DatadogTransportOptions): Transport => {
  const host = options.host ?? 'http-intake.logs.datadoghq.com'
  const source = options.source ?? 'logfx'
  const hostname = options.hostname ?? (typeof process !== 'undefined' ? process.env.HOSTNAME : 'unknown')

  const buffer: string[] = []
  const batchSize = 100
  const flushInterval = 5000
  let flushTimer: ReturnType<typeof setTimeout> | null = null

  const sendLogs = async (logs: string[]) => {
    if (logs.length === 0) return

    try {
      const response = await fetch(`https://${host}/api/v2/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'DD-API-KEY': options.apiKey
        },
        body: JSON.stringify(logs.map(log => JSON.parse(log)))
      })

      if (!response.ok) {
        console.error('Failed to send logs to Datadog:', response.statusText)
      }
    } catch (error) {
      console.error('Error sending logs to Datadog:', error)
    }
  }

  const flush = async () => {
    if (buffer.length > 0) {
      const logsToSend = buffer.splice(0, buffer.length)
      await sendLogs(logsToSend)
    }
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
  }

  const scheduleFlush = () => {
    if (!flushTimer) {
      flushTimer = setTimeout(() => {
        flush()
      }, flushInterval)
    }
  }

  return {
    name: 'datadog',
    log: (entry: LogEntry) => {
      const ddLog = {
        ddsource: source,
        ddtags: options.tags?.join(',') ?? '',
        hostname,
        message: entry.message,
        service: options.service,
        status: entry.level,
        timestamp: entry.timestamp.toISOString(),
        ...entry.data,
        namespace: entry.namespace,
        requestId: entry.requestId,
        trace_id: entry.trace?.traceId,
        span_id: entry.trace?.spanId
      }

      buffer.push(JSON.stringify(ddLog))

      if (buffer.length >= batchSize) {
        flush()
      } else {
        scheduleFlush()
      }
    },
    flush,
    close: flush
  }
}
