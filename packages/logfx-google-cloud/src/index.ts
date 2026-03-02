import type { Transport, LogEntry, WebhookTransportOptions } from 'logfx'
import { webhookTransport, serializeError } from 'logfx'

const severityMap: Record<string, string> = {
  debug: 'DEBUG',
  info: 'INFO',
  success: 'INFO',
  warn: 'WARNING',
  error: 'ERROR'
}

export interface GoogleCloudTransportOptions {
  projectId: string
  logId?: string
  accessToken: string
  resource?: { type: string; labels?: Record<string, string> }
  labels?: Record<string, string>
  batchSize?: number
  flushInterval?: number
  retry?: WebhookTransportOptions['retry']
  timeout?: number
}

const toGcpEntry = (entry: LogEntry) => {
  const payload: Record<string, unknown> = {
    '@timestamp': entry.timestamp.toISOString(),
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
  return {
    timestamp: entry.timestamp.toISOString(),
    severity: severityMap[entry.level] ?? 'INFO',
    jsonPayload: payload
  }
}

export const googleCloudTransport = (options: GoogleCloudTransportOptions): Transport => {
  const logName = `projects/${options.projectId}/logs/${options.logId ?? 'logfx'}`
  const resource = options.resource ?? { type: 'global', labels: {} }

  const webhook = webhookTransport({
    url: 'https://logging.googleapis.com/v2/entries:write',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${options.accessToken}`
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
      JSON.stringify({
        logName,
        resource,
        labels: options.labels,
        entries: entries.map((entry) => toGcpEntry(entry))
      })
  })

  return {
    name: 'google-cloud',
    log: (entry) => webhook.log(entry),
    flush: webhook.flush,
    close: webhook.close
  }
}
