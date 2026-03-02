import type { Transport, LogEntry } from 'logfx'
import { serializeError } from 'logfx'
import { createHmac } from 'crypto'

export interface AzureTransportOptions {
  workspaceId: string
  sharedKey: string
  logType?: string
  batchSize?: number
  flushInterval?: number
}

const buildSignature = (
  sharedKey: string,
  date: string,
  contentLength: number
): string => {
  const stringToSign = [
    'POST',
    String(contentLength),
    'application/json',
    `x-ms-date:${date}`,
    '/api/logs'
  ].join('\n')

  const key = Buffer.from(sharedKey, 'base64')
  const signature = createHmac('sha256', key).update(stringToSign, 'utf8').digest('base64')
  return signature
}

const toAzureRecord = (entry: LogEntry): Record<string, unknown> => {
  const record: Record<string, unknown> = {
    TimeGenerated: entry.timestamp.toISOString(),
    Level: entry.level,
    Message: entry.message,
    Namespace: entry.namespace ?? '',
    RequestId: entry.requestId ?? '',
    ...entry.data
  }
  if (entry.trace) {
    record.TraceId = entry.trace.traceId
    record.SpanId = entry.trace.spanId
  }
  if (entry.error) {
    record.Error = serializeError(entry.error)
  }
  return record
}

export const azureTransport = (options: AzureTransportOptions): Transport => {
  const workspaceId = options.workspaceId
  const logType = options.logType ?? 'LogFx'
  const batchSize = options.batchSize ?? 100
  const flushInterval = options.flushInterval ?? 5000

  let buffer: LogEntry[] = []
  let flushTimer: ReturnType<typeof setTimeout> | null = null

  const getRfc1123Date = () => new Date().toUTCString()

  const flush = async () => {
    if (buffer.length === 0) return
    const entries = buffer.splice(0, batchSize)
    const body = JSON.stringify(entries.map(toAzureRecord))
    const date = getRfc1123Date()
    const contentLength = Buffer.byteLength(body, 'utf8')
    const signature = buildSignature(options.sharedKey, date, contentLength)

    const response = await fetch(
      `https://${workspaceId}.ods.opinsights.azure.com/api/logs?api-version=2016-04-01`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Log-Type': logType,
          'x-ms-date': date,
          'Authorization': `SharedKey ${workspaceId}:${signature}`
        },
        body
      }
    )

    if (!response.ok) {
      buffer.unshift(...entries)
      throw new Error(`Azure Logs API error: ${response.status} ${response.statusText}`)
    }
  }

  const scheduleFlush = () => {
    if (flushTimer) return
    flushTimer = setTimeout(() => {
      flushTimer = null
      flush().catch(() => {})
    }, flushInterval)
  }

  return {
    name: 'azure',
    log: (entry: LogEntry) => {
      buffer.push(entry)
      if (buffer.length >= batchSize) {
        flush().catch(() => {})
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
