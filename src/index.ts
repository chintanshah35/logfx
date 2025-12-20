import { createLogger } from './logger'
import type { 
  Logger, 
  ExtendedLogger, 
  LoggerOptions, 
  LogLevel, 
  LogStyle, 
  BoxOptions, 
  BadgeColor,
  Transport,
  LogEntry,
  LogFormat,
  ConsoleTransportOptions,
  FileTransportOptions,
  WebhookTransportOptions,
  RedactOptions,
  SamplingOptions,
  BufferOptions
} from './types'

const defaultLogger = createLogger()

// Add process exit handler to flush/close default logger if it has transports
if (typeof process !== 'undefined' && process.on) {
  const cleanup = async () => {
    try {
      await defaultLogger.flush()
      await defaultLogger.close()
    } catch {
      // Ignore errors during cleanup
    }
  }
  
  // Handle graceful shutdown
  process.once('SIGINT', async () => {
    await cleanup()
    process.exit(0)
  })
  
  process.once('SIGTERM', async () => {
    await cleanup()
    process.exit(0)
  })
  
  // Handle uncaught exceptions - try to flush logs before exit
  process.once('uncaughtException', async (error) => {
    try {
      defaultLogger.error('Uncaught exception:', error)
      await cleanup()
    } catch {
      // Ignore errors during emergency cleanup
    }
    process.exit(1)
  })
  
  // Handle unhandled promise rejections
  process.once('unhandledRejection', async (reason) => {
    try {
      defaultLogger.error('Unhandled rejection:', reason)
      await cleanup()
    } catch {
      // Ignore errors during emergency cleanup
    }
    process.exit(1)
  })
}

export const log = defaultLogger

export { createLogger }

export const logger = (namespace: string, options?: Partial<LoggerOptions>): Logger => {
  return createLogger({ ...options, namespace })
}

// Transports
import { consoleTransport, fileTransport, webhookTransport } from './transports'

export const transports = {
  console: consoleTransport,
  file: fileTransport,
  webhook: webhookTransport,
}

export { consoleTransport, fileTransport, webhookTransport }

// Extended features
export { time, timeEnd } from './extended'
export { count, countReset } from './extended'
export { group, groupCollapsed, groupEnd } from './extended'
export { assert } from './extended'
export { box } from './extended'
export { table } from './extended'
export { diff } from './extended'
export { badge } from './extended'

import * as extended from './extended'
import { createTimerFunctions, createCounterFunctions } from './extended'

export const createExtendedLogger = (options?: LoggerOptions): ExtendedLogger => {
  const baseLogger = createLogger(options)
  
  // Create isolated timer and counter functions for this logger instance
  const timerFunctions = createTimerFunctions()
  const counterFunctions = createCounterFunctions()
  
  return {
    ...baseLogger,
    time: timerFunctions.time,
    timeEnd: timerFunctions.timeEnd,
    count: counterFunctions.count,
    countReset: counterFunctions.countReset,
    group: extended.group,
    groupCollapsed: extended.groupCollapsed,
    groupEnd: extended.groupEnd,
    assert: extended.assert,
    box: extended.box,
    table: extended.table,
    diff: extended.diff,
    badge: extended.badge,
  }
}

// Types
export type { 
  Logger, 
  ExtendedLogger,
  LoggerOptions, 
  LogLevel, 
  LogStyle,
  BoxOptions,
  BadgeColor,
  Transport,
  LogEntry,
  LogFormat,
  ConsoleTransportOptions,
  FileTransportOptions,
  WebhookTransportOptions,
  RedactOptions,
  SamplingOptions,
  BufferOptions
}

export default log
