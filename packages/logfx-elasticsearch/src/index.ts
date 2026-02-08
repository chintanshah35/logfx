import type { Transport, LogEntry } from 'logfx'
import { Client } from '@elastic/elasticsearch'

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
}

export const elasticsearchTransport = (options: ElasticsearchTransportOptions): Transport => {
  const client = new Client({
    node: options.node,
    auth: options.auth
  })

  const index = options.index ?? 'logfx'
  const batchSize = options.batchSize ?? 100
  const flushInterval = options.flushInterval ?? 5000

  const buffer: LogEntry[] = []
  let flushTimer: ReturnType<typeof setTimeout> | null = null

  const flush = async () => {
    if (buffer.length === 0) return

    const logsToSend = buffer.splice(0, buffer.length)
    const body = logsToSend.flatMap(entry => [
      { index: { _index: index } },
      {
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
    ])

    try {
      await client.bulk({ body })
    } catch (error) {
      console.error('Failed to send logs to Elasticsearch:', error)
    }

    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
  }

  const scheduleFlush = () => {
    if (!flushTimer) {
      flushTimer = setTimeout(() => {
        flush()
      }, flushInterval)
    }
  }

  return {
    name: 'elasticsearch',
    log: (entry: LogEntry) => {
      buffer.push(entry)

      if (buffer.length >= batchSize) {
        flush()
      } else {
        scheduleFlush()
      }
    },
    flush,
    close: async () => {
      await flush()
      await client.close()
    }
  }
}
