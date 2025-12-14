import type { Transport, LogEntry, ConsoleTransportOptions, LogLevel } from '../types'
import { styles, ansiColors, isBrowser } from '../styles'
import { formatJson } from '../formatters'

const logMethods: Record<LogLevel, 'log' | 'warn' | 'error' | 'debug'> = {
  debug: 'debug',
  info: 'log',
  success: 'log',
  warn: 'warn',
  error: 'error'
}

const formatTimestamp = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  const millis = date.getMilliseconds().toString().padStart(3, '0')
  return `${hours}:${minutes}:${seconds}.${millis}`
}

const prettyBrowser = (entry: LogEntry, options: ConsoleTransportOptions): void => {
  const style = styles[entry.level]
  const parts: string[] = [`${style.emoji}`, `%c ${style.label} `]
  const cssStyles: string[] = [
    `background: ${style.color}; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold; font-size: 10px;`
  ]

  if (entry.namespace) {
    parts.push(`%c ${entry.namespace} `)
    cssStyles.push(`background: ${style.bgColor}; color: ${style.color}; padding: 2px 6px; border-radius: 3px; font-size: 10px;`)
  }

  if (options.timestamps !== false) {
    parts.push(`%c ${formatTimestamp(entry.timestamp)} `)
    cssStyles.push(`color: #9CA3AF; font-size: 10px;`)
  }

  parts.push('%c')
  cssStyles.push('color: inherit;')

  const args: unknown[] = [entry.message]
  if (entry.data && Object.keys(entry.data).length > 0) args.push(entry.data)
  if (entry.error) args.push(entry.error)

  console[logMethods[entry.level]](parts.join(''), ...cssStyles, ...args)
}

const prettyNode = (entry: LogEntry, options: ConsoleTransportOptions): void => {
  const style = styles[entry.level]
  const colors = ansiColors[entry.level]
  const parts: string[] = []

  if (options.colors !== false) {
    parts.push(`${style.emoji} ${colors.fg}${colors.bg} ${style.label} ${colors.reset}`)
    if (entry.namespace) parts.push(`${colors.fg}[${entry.namespace}]${colors.reset}`)
    if (options.timestamps !== false) parts.push(`\x1b[90m${formatTimestamp(entry.timestamp)}\x1b[0m`)
  } else {
    parts.push(`${style.emoji} [${style.label}]`)
    if (entry.namespace) parts.push(`[${entry.namespace}]`)
    if (options.timestamps !== false) parts.push(formatTimestamp(entry.timestamp))
  }

  const output: unknown[] = [parts.join(' '), entry.message]
  if (entry.data && Object.keys(entry.data).length > 0) output.push(JSON.stringify(entry.data, null, 2))
  if (entry.error) output.push(entry.error)

  console[logMethods[entry.level]](...output)
}

export const consoleTransport = (options: ConsoleTransportOptions = {}): Transport => ({
  name: 'console',
  log: (entry: LogEntry) => {
    if (options.format === 'json') {
      console[logMethods[entry.level]](formatJson(entry))
      return
    }
    isBrowser ? prettyBrowser(entry, options) : prettyNode(entry, options)
  }
})
