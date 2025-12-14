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
  WebhookTransportOptions
} from './types'

const defaultLogger = createLogger()

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

export const createExtendedLogger = (options?: LoggerOptions): ExtendedLogger => {
  const baseLogger = createLogger(options)
  
  return {
    ...baseLogger,
    time: extended.time,
    timeEnd: extended.timeEnd,
    count: extended.count,
    countReset: extended.countReset,
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
  WebhookTransportOptions
}

export default log
