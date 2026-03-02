import type { Transport, LogEntry, WebhookTransportOptions } from 'logfx'
import { webhookTransport, serializeError } from 'logfx'

export interface ElasticsearchTransportOptions {
  node: string | string[]
  index?: string
  auth?: {
    username: string
    password: string
  } | {
    apiKey: string
  }
  batchSize?: number
  flushInterval?: number
  retry?: WebhookTransportOptions['retry']
  circuitBreaker?: WebhookTransportOptions['circuitBreaker']
  dlq?: WebhookTransportOptions['dlq']
  timeout?: number
}

const toBulkUrl = (base: string): string => {
  const trimmed = base.replace(/\/+$/, '')
  return trimmed.includes('/_bulk') ? trimmed : `${trimmed}/_bulk`
}

export const elasticsearchTransport = (options: ElasticsearchTransportOptions): Transport => {
  const index = options.index ?? 'logfx'
  const nodes = Array.isArray(options.node) ? options.node : [options.node]
  const bulkUrls = nodes.map(node => toBulkUrl(typeof node === 'string' ? node : String(node)))

  const authHeader: Record<string, string> = options.auth
    ? 'apiKey' in options.auth
      ? { 'Authorization': `ApiKey ${options.auth.apiKey}` }
      : { 'Authorization': `Basic ${Buffer.from(`${options.auth.username}:${options.auth.password}`).toString('base64')}` }
    : {}

  const webhook = webhookTransport({
    url: bulkUrls[0],
    urls: bulkUrls.length > 1 ? bulkUrls : undefined,
    headers: {
      'Content-Type': 'application/x-ndjson',
      ...authHeader
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
    failover: bulkUrls.length > 1 ? {
      strategy: 'round-robin',
      healthCheck: true
    } : undefined,
    formatBody: (entries) => {
      let body = ''
      for (const entry of entries) {
        const esDoc = {
          '@timestamp': entry.timestamp.toISOString(),
          level: entry.level,
          message: entry.message,
          namespace: entry.namespace,
          requestId: entry.requestId,
          trace: entry.trace,
          ...entry.data,
          error: entry.error ? serializeError(entry.error) : undefined
        }
        const bulkAction = { index: { _index: index } }
        body += `${JSON.stringify(bulkAction)}\n${JSON.stringify(esDoc)}\n`
      }
      return body
    }
  })

  return {
    name: 'elasticsearch',
    log: (entry: LogEntry) => {
      webhook.log(entry)
    },
    flush: webhook.flush,
    close: webhook.close
  }
}
