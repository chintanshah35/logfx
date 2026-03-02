import type { Transport, LogEntry, WebhookTransportOptions } from 'logfx'
import { webhookTransport, serializeError } from 'logfx'

export interface SplunkTransportOptions {
  url: string
  token: string
  source?: string
  sourcetype?: string
  batchSize?: number
  flushInterval?: number
  retry?: WebhookTransportOptions['retry']
  timeout?: number
}

const toSplunkEvent = (entry: LogEntry): Record<string, unknown> => {
  const event: Record<string, unknown> = {
    timestamp: entry.timestamp.toISOString(),
    level: entry.level,
    message: entry.message,
    namespace: entry.namespace,
    requestId: entry.requestId,
    ...entry.data
  }
  if (entry.trace) {
    event.traceId = entry.trace.traceId
    event.spanId = entry.trace.spanId
  }
  if (entry.error) {
    event.error = serializeError(entry.error)
  }
  return event
}

export const splunkTransport = (options: SplunkTransportOptions): Transport => {
  const baseUrl = options.url.replace(/\/+$/, '')
  const collectUrl = baseUrl.includes('/services/collector')
    ? baseUrl
    : `${baseUrl}/services/collector/event`

  const webhook = webhookTransport({
    url: collectUrl,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Splunk ${options.token}`
    },
    batchSize: options.batchSize ?? 100,
    flushInterval: options.flushInterval ?? 5000,
    timeout: options.timeout ?? 30000,
    retry: options.retry ?? {
      maxRetries: 3,
      initialDelay: 1000,
      backoff: 'exponential'
    },
    formatBody: (entries) =>
      entries
        .map((entry) =>
          JSON.stringify({
            event: toSplunkEvent(entry),
            sourcetype: options.sourcetype ?? 'logfx',
            source: options.source ?? 'logfx',
            time: entry.timestamp.getTime() / 1000
          })
        )
        .join('\n')
  })

  return {
    name: 'splunk',
    log: (entry) => webhook.log(entry),
    flush: webhook.flush,
    close: webhook.close
  }
}
