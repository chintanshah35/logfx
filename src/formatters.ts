import type { LogLevel, LoggerOptions } from './types'
import { styles, ansiColors } from './styles'

/**
 * Format timestamp
 */
export const formatTimestamp = (): string => {
  const now = new Date()
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  const seconds = now.getSeconds().toString().padStart(2, '0')
  const ms = now.getMilliseconds().toString().padStart(3, '0')
  return `${hours}:${minutes}:${seconds}.${ms}`
}

/**
 * Format namespace for display
 */
export const formatNamespace = (namespace?: string): string => {
  if (!namespace) return ''
  return `[${namespace}]`
}

/**
 * Format log output for browser console
 */
export const formatBrowser = (
  level: LogLevel,
  options: LoggerOptions,
  args: unknown[]
): { prefix: string; styles: string[]; args: unknown[] } => {
  const style = styles[level]
  const parts: string[] = []
  const cssStyles: string[] = []

  // Emoji
  parts.push(`${style.emoji}`)

  // Badge with styling
  parts.push(`%c ${style.label} `)
  cssStyles.push(
    `background: ${style.color}; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold; font-size: 10px;`
  )

  // Namespace
  if (options.namespace) {
    parts.push(`%c ${options.namespace} `)
    cssStyles.push(
      `background: ${style.bgColor}; color: ${style.color}; padding: 2px 6px; border-radius: 3px; font-size: 10px;`
    )
  }

  // Timestamp
  if (options.timestamp) {
    parts.push(`%c ${formatTimestamp()} `)
    cssStyles.push(`color: #9CA3AF; font-size: 10px;`)
  }

  // Reset for message
  parts.push('%c')
  cssStyles.push('color: inherit;')

  return {
    prefix: parts.join(''),
    styles: cssStyles,
    args,
  }
}

/**
 * Format log output for Node.js terminal
 */
export const formatNode = (
  level: LogLevel,
  options: LoggerOptions,
  args: unknown[]
): string[] => {
  const style = styles[level]
  const colors = ansiColors[level]
  const parts: string[] = []

  // Emoji + Level badge
  parts.push(`${style.emoji} ${colors.fg}${colors.bg} ${style.label} ${colors.reset}`)

  // Namespace
  if (options.namespace) {
    parts.push(`${colors.fg}[${options.namespace}]${colors.reset}`)
  }

  // Timestamp
  if (options.timestamp) {
    parts.push(`\x1b[90m${formatTimestamp()}\x1b[0m`)
  }

  // Format args
  const formattedArgs = args.map((arg) => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg, null, 2)
      } catch {
        return String(arg)
      }
    }
    return String(arg)
  })

  return [parts.join(' '), ...formattedArgs]
}

/**
 * Get the appropriate console method for a log level
 */
export const getConsoleMethod = (level: LogLevel): 'log' | 'warn' | 'error' | 'debug' | 'info' => {
  switch (level) {
    case 'error':
      return 'error'
    case 'warn':
      return 'warn'
    case 'debug':
      return 'debug'
    case 'info':
    case 'success':
    default:
      return 'log'
  }
}

