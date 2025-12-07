import { createLogger } from './logger'
import type { Logger, ExtendedLogger, LoggerOptions, LogLevel, LogStyle, BoxOptions, BadgeColor } from './types'

// Default logger instance
const defaultLogger = createLogger()

/**
 * Ready-to-use logger instance
 * @example
 * import { log } from 'logfx'
 * log.info('Hello!')
 */
export const log = defaultLogger

export { createLogger }

/**
 * Shorthand for creating a namespaced logger
 */
export const logger = (namespace: string, options?: Partial<LoggerOptions>): Logger => {
  return createLogger({ ...options, namespace })
}

// Extended features - tree-shakeable, import what you need
export { time, timeEnd } from './extended'
export { count, countReset } from './extended'
export { group, groupCollapsed, groupEnd } from './extended'
export { assert } from './extended'
export { box } from './extended'
export { table } from './extended'
export { diff } from './extended'
export { badge } from './extended'

import * as extended from './extended'

/**
 * Logger with all extended methods built-in.
 * Use this if you want everything on one object.
 */
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
  BadgeColor
}

export default log
