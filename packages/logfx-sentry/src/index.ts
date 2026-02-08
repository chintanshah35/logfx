import type { Transport, LogEntry } from 'logfx'
import * as Sentry from '@sentry/node'

export interface SentryTransportOptions {
  minLevel?: 'debug' | 'info' | 'warn' | 'error'
  captureContext?: boolean
  tags?: Record<string, string>
}

const levelMap = {
  debug: 'debug',
  info: 'info',
  success: 'info',
  warn: 'warning',
  error: 'error'
} as const

export const sentryTransport = (options: SentryTransportOptions = {}): Transport => {
  const minLevel = options.minLevel ?? 'warn'
  const captureContext = options.captureContext ?? true
  const tags = options.tags ?? {}

  const levelPriority = { debug: 0, info: 1, success: 1, warn: 2, error: 3 }

  return {
    name: 'sentry',
    log: (entry: LogEntry) => {
      if (levelPriority[entry.level as keyof typeof levelPriority] < levelPriority[minLevel]) {
        return
      }

      const sentryLevel = levelMap[entry.level as keyof typeof levelMap] ?? 'info'

      if (entry.error) {
        Sentry.captureException(entry.error, {
          level: sentryLevel as Sentry.SeverityLevel,
          tags: {
            ...tags,
            namespace: entry.namespace ?? 'default',
            requestId: entry.requestId ?? ''
          },
          contexts: captureContext && entry.data ? {
            logData: entry.data as Record<string, unknown>
          } : undefined,
          extra: {
            message: entry.message,
            timestamp: entry.timestamp.toISOString()
          }
        })
      } else {
        Sentry.captureMessage(entry.message, {
          level: sentryLevel as Sentry.SeverityLevel,
          tags: {
            ...tags,
            namespace: entry.namespace ?? 'default',
            level: entry.level
          },
          contexts: captureContext && entry.data ? {
            logData: entry.data as Record<string, unknown>
          } : undefined
        })
      }
    }
  }
}
