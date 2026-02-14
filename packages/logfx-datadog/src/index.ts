import type { Transport, LogEntry, WebhookTransportOptions } from 'logfx'
import { webhookTransport } from 'logfx'

export interface DatadogTransportOptions {
  apiKey: string
  service: string
  host?: string
  tags?: string[]
  source?: string
  hostname?: string
  batchSize?: number
  flushInterval?: number
  retry?: WebhookTransportOptions['retry']
  circuitBreaker?: WebhookTransportOptions['circuitBreaker']
  dlq?: WebhookTransportOptions['dlq']
  timeout?: number
}

const toDatadogLog = (entry: LogEntry, options: DatadogTransportOptions, hostname: string) => ({
  ddsource: options.source ?? 'logfx',
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
})

export const datadogTransport = (options: DatadogTransportOptions): Transport => {
  const host = options.host ?? 'http-intake.logs.datadoghq.com'
  const hostname = options.hostname ?? (typeof process !== 'undefined' ? process.env?.HOSTNAME : undefined) ?? 'unknown'

  const webhook = webhookTransport({
    url: `https://${host}/api/v2/logs`,
    headers: {
      'Content-Type': 'application/json',
      'DD-API-KEY': options.apiKey
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
    formatBody: (entries) =>
      JSON.stringify(entries.map((entry) => toDatadogLog(entry, options, hostname)))
  })

  return {
    name: 'datadog',
    log: (entry) => webhook.log(entry),
    flush: webhook.flush,
    close: webhook.close
  }
}
