import type { Transport, LogEntry, WebhookTransportOptions } from 'logfx'
import { webhookTransport } from 'logfx'

export interface PapertrailTransportOptions {
  url: string
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

const toPapertrailRecord = (entry: LogEntry): Record<string, unknown> => {
  const record: Record<string, unknown> = {
    timestamp: entry.timestamp.toISOString(),
    level: entry.level,
    message: entry.message,
    namespace: entry.namespace,
    requestId: entry.requestId,
    ...entry.data
  }
  if (entry.trace) {
    record.traceId = entry.trace.traceId
    record.spanId = entry.trace.spanId
  }
  if (entry.error) {
    record.error = serializeError(entry.error)
  }
  return record
}

export const papertrailTransport = (options: PapertrailTransportOptions): Transport => {
  const webhook = webhookTransport({
    url: options.url,
    headers: { 'Content-Type': 'application/json' },
    batchSize: options.batchSize ?? 100,
    flushInterval: options.flushInterval ?? 5000,
    timeout: options.timeout ?? 30000,
    retry: options.retry ?? {
      maxRetries: 3,
      initialDelay: 1000,
      backoff: 'exponential'
    },
    formatBody: (entries) =>
      JSON.stringify(entries.map(toPapertrailRecord))
  })

  return {
    name: 'papertrail',
    log: (entry) => webhook.log(entry),
    flush: webhook.flush,
    close: webhook.close
  }
}
