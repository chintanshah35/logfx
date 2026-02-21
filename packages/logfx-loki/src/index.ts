import type { Transport, LogEntry, WebhookTransportOptions } from 'logfx'
import { webhookTransport } from 'logfx'

export interface LokiTransportOptions {
  url: string
  labels?: Record<string, string>
  batchSize?: number
  flushInterval?: number
  retry?: WebhookTransportOptions['retry']
  timeout?: number
}

const serializeError = (error: Error): Record<string, unknown> => {
  const errorWithCause = error as Error & { code?: string; cause?: unknown }
  const serialized: Record<string, unknown> = {
    name: error?.name ?? 'Error',
    message: error?.message ?? String(error),
    stack: error?.stack
  }
  if (errorWithCause.code) serialized.code = errorWithCause.code
  if (errorWithCause.cause) {
    serialized.cause = errorWithCause.cause instanceof Error
      ? serializeError(errorWithCause.cause)
      : errorWithCause.cause
  }
  return serialized
}

const toLokiLine = (entry: LogEntry): string => {
  const payload: Record<string, unknown> = {
    timestamp: entry.timestamp.toISOString(),
    level: entry.level,
    message: entry.message,
    namespace: entry.namespace,
    requestId: entry.requestId,
    trace: entry.trace,
    ...entry.data
  }
  if (entry.error) {
    payload.error = serializeError(entry.error)
  }
  return JSON.stringify(payload)
}

const toLokiTimestamp = (date: Date): string => {
  return String(date.getTime() * 1_000_000)
}

export const lokiTransport = (options: LokiTransportOptions): Transport => {
  const baseUrl = options.url.replace(/\/+$/, '')
  const pushUrl = baseUrl.includes('/loki/api/v1/push')
    ? baseUrl
    : `${baseUrl}/loki/api/v1/push`

  const streamLabels = options.labels ?? { app: 'logfx' }

  const webhook = webhookTransport({
    url: pushUrl,
    headers: { 'Content-Type': 'application/json' },
    batchSize: options.batchSize ?? 100,
    flushInterval: options.flushInterval ?? 5000,
    timeout: options.timeout ?? 30000,
    retry: options.retry ?? {
      maxRetries: 3,
      initialDelay: 1000,
      backoff: 'exponential'
    },
    formatBody: (entries) => {
      const values = entries.map((entry) => [
        toLokiTimestamp(entry.timestamp),
        toLokiLine(entry)
      ])
      return JSON.stringify({
        streams: [{ stream: streamLabels, values }]
      })
    }
  })

  return {
    name: 'loki',
    log: (entry) => webhook.log(entry),
    flush: webhook.flush,
    close: webhook.close
  }
}
