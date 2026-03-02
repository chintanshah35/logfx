import type { Transport, LogEntry } from 'logfx'
import { serializeError } from 'logfx'
import { PutLogEventsCommand, CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs'

export interface CloudWatchTransportOptions {
  logGroupName: string
  logStreamName: string
  region?: string
  credentials?: {
    accessKeyId: string
    secretAccessKey: string
  }
  batchSize?: number
  flushInterval?: number
  maxRetries?: number
}

const toCloudWatchEvent = (entry: LogEntry) => {
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
    message: JSON.stringify(payload),
    timestamp: entry.timestamp.getTime()
  }
}

export const cloudwatchTransport = (options: CloudWatchTransportOptions): Transport => {
  const logGroupName = options.logGroupName
  const logStreamName = options.logStreamName
  const batchSize = options.batchSize ?? 100
  const flushInterval = options.flushInterval ?? 5000
  const maxRetries = options.maxRetries ?? 3

  const client = new CloudWatchLogsClient({
    region: options.region ?? process.env?.AWS_REGION ?? 'us-east-1',
    credentials: options.credentials
  })

  let buffer: LogEntry[] = []
  let flushTimer: ReturnType<typeof setTimeout> | null = null
  let sequenceToken: string | undefined
  let consecutiveFailures = 0

  const flush = async () => {
    if (buffer.length === 0) return
    const entries = buffer.splice(0, batchSize)
    const events = entries.map(toCloudWatchEvent).sort((a, b) => a.timestamp - b.timestamp)

    const sendBatch = async (token: string | undefined): Promise<void> => {
      const result = await client.send(
        new PutLogEventsCommand({
          logGroupName,
          logStreamName,
          logEvents: events,
          sequenceToken: token
        })
      )
      sequenceToken = result.nextSequenceToken
      consecutiveFailures = 0
    }

    try {
      await sendBatch(sequenceToken)
    } catch (error) {
      const awsError = error as { name?: string; expectedSequenceToken?: string }
      if (awsError.name === 'InvalidSequenceTokenException' && awsError.expectedSequenceToken) {
        sequenceToken = awsError.expectedSequenceToken
        try {
          await sendBatch(sequenceToken)
          return
        } catch (retryError) {
          buffer.unshift(...entries)
          throw retryError
        }
      }
      consecutiveFailures++
      if (consecutiveFailures <= maxRetries) {
        buffer.unshift(...entries)
      }
      throw error
    }
  }

  const scheduleFlush = () => {
    if (flushTimer) return
    flushTimer = setTimeout(() => {
      flushTimer = null
      flush().catch((error) => {
        if (typeof console !== 'undefined') {
          console.error('[logfx:cloudwatch] Flush failed:', error?.message ?? String(error))
        }
      })
    }, flushInterval)
  }

  return {
    name: 'cloudwatch',
    log: (entry: LogEntry) => {
      buffer.push(entry)
      if (buffer.length >= batchSize) {
        flush().catch((error) => {
          if (typeof console !== 'undefined') {
            console.error('[logfx:cloudwatch] Flush failed:', error?.message ?? String(error))
          }
        })
      } else {
        scheduleFlush()
      }
    },
    flush: async () => {
      if (flushTimer) {
        clearTimeout(flushTimer)
        flushTimer = null
      }
      await flush()
    },
    close: async () => {
      if (flushTimer) {
        clearTimeout(flushTimer)
        flushTimer = null
      }
      await flush()
    }
  }
}
