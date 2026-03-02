import type { Transport, LogEntry, WebhookTransportOptions } from 'logfx'
import { webhookTransport, serializeError } from 'logfx'

export interface SlackTransportOptions {
  webhookUrl: string
  batchSize?: number
  flushInterval?: number
  retry?: WebhookTransportOptions['retry']
  timeout?: number
}

const toSlackLine = (entry: LogEntry): string => {
  const payload: Record<string, unknown> = {
    timestamp: entry.timestamp.toISOString(),
    level: entry.level,
    message: entry.message,
    namespace: entry.namespace,
    requestId: entry.requestId,
    ...entry.data
  }
  if (entry.trace) {
    payload.traceId = entry.trace.traceId
    payload.spanId = entry.trace.spanId
  }
  if (entry.error) {
    payload.error = serializeError(entry.error)
  }
  return JSON.stringify(payload)
}

export const slackTransport = (options: SlackTransportOptions): Transport => {
  const webhook = webhookTransport({
    url: options.webhookUrl,
    headers: { 'Content-Type': 'application/json' },
    batchSize: options.batchSize ?? 10,
    flushInterval: options.flushInterval ?? 5000,
    timeout: options.timeout ?? 30000,
    retry: options.retry ?? {
      maxRetries: 3,
      initialDelay: 1000,
      backoff: 'exponential'
    },
    formatBody: (entries) => {
      const lines = entries.map(toSlackLine)
      const text = lines.length === 1 ? lines[0] : `\`\`\`\n${lines.join('\n')}\n\`\`\``
      return JSON.stringify({ text })
    }
  })

  return {
    name: 'slack',
    log: (entry) => webhook.log(entry),
    flush: webhook.flush,
    close: webhook.close
  }
}
