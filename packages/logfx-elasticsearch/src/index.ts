import type { Transport, LogEntry, WebhookTransportOptions } from 'logfx'
import { webhookTransport } from 'logfx'

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

export const elasticsearchTransport = (options: ElasticsearchTransportOptions): Transport => {
  const index = options.index ?? 'logfx'
  const nodes = Array.isArray(options.node) ? options.node : [options.node]
  
  const authHeader: Record<string, string> = options.auth 
    ? 'apiKey' in options.auth
      ? { 'Authorization': `ApiKey ${options.auth.apiKey}` }
      : { 'Authorization': `Basic ${Buffer.from(`${options.auth.username}:${options.auth.password}`).toString('base64')}` }
    : {}

  const webhook = webhookTransport({
    url: nodes[0],
    urls: nodes.length > 1 ? nodes : undefined,
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
    failover: nodes.length > 1 ? {
      strategy: 'round-robin',
      healthCheck: true
    } : undefined
  })

  return {
    name: 'elasticsearch',
    log: (entry: LogEntry) => {
      const esDoc = {
        '@timestamp': entry.timestamp.toISOString(),
        level: entry.level,
        message: entry.message,
        namespace: entry.namespace,
        requestId: entry.requestId,
        trace: entry.trace,
        ...entry.data,
        error: entry.error ? {
          message: entry.error?.message ?? String(entry.error),
          stack: entry.error?.stack,
          name: entry.error?.name ?? 'Error'
        } : undefined
      }

      const bulkAction = { index: { _index: index } }
      
      webhook.log({
        ...entry,
        data: {
          bulk: `${JSON.stringify(bulkAction)}\n${JSON.stringify(esDoc)}\n`
        }
      })
    },
    flush: webhook.flush,
    close: webhook.close
  }
}
