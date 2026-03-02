import type { Transport, LogEntry, WebhookTransportOptions } from 'logfx'
import { webhookTransport, serializeError } from 'logfx'

export interface HoneycombTransportOptions {
  apiKey: string
  dataset: string
  host?: string
  batchSize?: number
  flushInterval?: number
  retry?: WebhookTransportOptions['retry']
  circuitBreaker?: WebhookTransportOptions['circuitBreaker']
  dlq?: WebhookTransportOptions['dlq']
  timeout?: number
}

const toHoneycombEvent = (entry: LogEntry): { time: string; data: Record<string, unknown> } => {
  const data: Record<string, unknown> = {
    level: entry.level,
    message: entry.message,
    ...entry.data
  }
  if (entry.namespace) data.namespace = entry.namespace
  if (entry.requestId) data.requestId = entry.requestId
  if (entry.trace) {
    data.traceId = entry.trace.traceId
    data.spanId = entry.trace.spanId
  }
  if (entry.error) data.error = serializeError(entry.error)

  return {
    time: entry.timestamp.toISOString(),
    data
  }
}

export const honeycombTransport = (options: HoneycombTransportOptions): Transport => {
  const host = options.host ?? 'https://api.honeycomb.io'
  const baseUrl = host.replace(/\/+$/, '')
  const dataset = encodeURIComponent(options.dataset)
  const url = `${baseUrl}/1/batch/${dataset}`

  const webhook = webhookTransport({
    url,
    headers: {
      'Content-Type': 'application/json',
      'X-Honeycomb-Team': options.apiKey
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
    formatBody: (entries) => JSON.stringify(entries.map(toHoneycombEvent))
  })

  return {
    name: 'honeycomb',
    log: (entry) => webhook.log(entry),
    flush: webhook.flush,
    close: webhook.close
  }
}
