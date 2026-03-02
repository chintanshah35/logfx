import type { Transport, LogEntry, WebhookTransportOptions } from 'logfx'
import { webhookTransport, serializeError } from 'logfx'

export interface LogtailTransportOptions {
  sourceToken: string
  url?: string
  batchSize?: number
  flushInterval?: number
  retry?: WebhookTransportOptions['retry']
  circuitBreaker?: WebhookTransportOptions['circuitBreaker']
  dlq?: WebhookTransportOptions['dlq']
  timeout?: number
}

const toLogtailEvent = (entry: LogEntry): Record<string, unknown> => {
  const event: Record<string, unknown> = {
    dt: entry.timestamp.toISOString(),
    level: entry.level,
    message: entry.message,
    ...entry.data
  }
  if (entry.namespace) event.namespace = entry.namespace
  if (entry.requestId) event.requestId = entry.requestId
  if (entry.trace) {
    event.traceId = entry.trace.traceId
    event.spanId = entry.trace.spanId
  }
  if (entry.error) event.error = serializeError(entry.error)

  return event
}

export const logtailTransport = (options: LogtailTransportOptions): Transport => {
  const url = options.url ?? 'https://in.logs.betterstack.com'

  const webhook = webhookTransport({
    url,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${options.sourceToken}`
    },
    batchSize: options.batchSize ?? 100,
    flushInterval: options.flushInterval ?? 5000,
    timeout: options.timeout ?? 30000,
    retry: options.retry ?? {
      maxRetries: 3,
      initialDelay: 1000,
      backoff: 'exponential'
    },
    circuitBreaker: options.circuitBreaker ?? {
      enabled: true,
      threshold: 5,
      timeout: 30000
    },
    dlq: options.dlq ?? {
      enabled: true,
      maxSize: 1000,
      overflow: 'drop-oldest'
    },
    formatBody: (entries) => JSON.stringify(entries.map(toLogtailEvent))
  })

  return {
    name: 'logtail',
    log: (entry) => webhook.log(entry),
    flush: webhook.flush,
    close: webhook.close
  }
}
