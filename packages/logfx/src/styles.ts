import type { LogLevel, LogStyle } from './types'
import { isProduction } from './env'

/**
 * Check if we're running in a browser environment
 */
export const isBrowser = typeof window !== 'undefined'

// Re-export isProduction for backwards compatibility
export { isProduction }

/**
 * Style definitions for each log level
 */
export const styles: Record<LogLevel, LogStyle> = {
  debug: {
    emoji: '🔍',
    color: '#6B7280',   // Gray
    bgColor: '#F3F4F6',
    label: 'DEBUG',
  },
  info: {
    emoji: '💡',
    color: '#10B981',   // Green
    bgColor: '#D1FAE5',
    label: 'INFO',
  },
  success: {
    emoji: '✅',
    color: '#10B981',   // Green
    bgColor: '#D1FAE5',
    label: 'SUCCESS',
  },
  warn: {
    emoji: '⚠️',
    color: '#F59E0B',   // Yellow/Orange
    bgColor: '#FEF3C7',
    label: 'WARN',
  },
  error: {
    emoji: '🔴',
    color: '#EF4444',   // Red
    bgColor: '#FEE2E2',
    label: 'ERROR',
  },
}

/**
 * ANSI color codes for Node.js terminal output
 */
export const ansiColors: Record<LogLevel, { fg: string; bg: string; reset: string }> = {
  debug: {
    fg: '\x1b[90m',      // Gray
    bg: '\x1b[100m',     // Gray background
    reset: '\x1b[0m',
  },
  info: {
    fg: '\x1b[32m',      // Green
    bg: '\x1b[42m',      // Green background
    reset: '\x1b[0m',
  },
  success: {
    fg: '\x1b[32m',      // Green
    bg: '\x1b[42m',      // Green background
    reset: '\x1b[0m',
  },
  warn: {
    fg: '\x1b[33m',      // Yellow
    bg: '\x1b[43m',      // Yellow background
    reset: '\x1b[0m',
  },
  error: {
    fg: '\x1b[31m',      // Red
    bg: '\x1b[41m',      // Red background
    reset: '\x1b[0m',
  },
}

/**
 * Log level priority for filtering
 */
export const levelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  success: 2,
  warn: 3,
  error: 4,
}

