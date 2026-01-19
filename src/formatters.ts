import type { LogLevel, LoggerOptions, LogEntry } from './types'
import { styles, ansiColors } from './styles'
import { safeStringify } from './json'

const shouldDisableColors = (): boolean => {
  // Check NO_COLOR environment variable (standard)
  if (typeof process !== 'undefined' && process.env?.NO_COLOR) {
    return true
  }
  
  // Check FORCE_COLOR (can force colors even in CI)
  if (typeof process !== 'undefined' && process.env?.FORCE_COLOR === '1') {
    return false
  }
  
  // Check if we're in a CI environment
  if (typeof process !== 'undefined' && process.env) {
    const ciEnvVars = ['CI', 'CONTINUOUS_INTEGRATION', 'BUILD_NUMBER', 'RUN_ID']
    for (const envVar of ciEnvVars) {
      if (process.env[envVar]) {
        return true
      }
    }
  }
  
  // Check if stdout is a TTY (terminal)
  if (typeof process !== 'undefined' && process.stdout && typeof process.stdout.isTTY === 'boolean') {
    return !process.stdout.isTTY
  }
  
  return false
}

let colorsDisabled: boolean | null = null
const getColorsDisabled = (): boolean => {
  if (colorsDisabled === null) {
    colorsDisabled = shouldDisableColors()
  }
  return colorsDisabled
}

export const formatTimestamp = (): string => {
  const now = new Date()
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  const seconds = now.getSeconds().toString().padStart(2, '0')
  const ms = now.getMilliseconds().toString().padStart(3, '0')
  return `${hours}:${minutes}:${seconds}.${ms}`
}

export const formatNamespace = (namespace?: string): string => {
  if (!namespace) return ''
  return `[${namespace}]`
}

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

export const formatNode = (
  level: LogLevel,
  options: LoggerOptions,
  args: unknown[]
): string[] => {
  const style = styles[level]
  const colors = ansiColors[level]
  const parts: string[] = []
  const disableColors = getColorsDisabled()

  // Emoji + Level badge (emoji works in most CI, colors don't)
  if (disableColors) {
    parts.push(`${style.emoji} ${style.label}`)
  } else {
    parts.push(`${style.emoji} ${colors.fg}${colors.bg} ${style.label} ${colors.reset}`)
  }

  // Namespace
  if (options.namespace) {
    if (disableColors) {
      parts.push(`[${options.namespace}]`)
    } else {
      parts.push(`${colors.fg}[${options.namespace}]${colors.reset}`)
    }
  }

  // Timestamp
  if (options.timestamp) {
    if (disableColors) {
      parts.push(formatTimestamp())
    } else {
      parts.push(`\x1b[90m${formatTimestamp()}\x1b[0m`)
    }
  }

  // Format args with circular reference and BigInt handling
  const formattedArgs = args.map((arg) => {
    if (arg instanceof Error) {
      if (disableColors) {
        return arg.stack || `${arg.name}: ${arg.message}`
      }
      const stack = arg.stack || `${arg.name}: ${arg.message}`
      return `\x1b[31m${stack}\x1b[0m`
    }
    
    if (typeof arg === 'object' && arg !== null) {
      try {
        return safeStringify(arg, 2)
      } catch {
        return String(arg)
      }
    }
    return String(arg)
  })

  return [parts.join(' '), ...formattedArgs]
}

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

const serializeError = (error: Error): Record<string, unknown> => {
  const serialized: Record<string, unknown> = {
    name: error.name,
    message: error.message,
    stack: error.stack
  }
  
  const errorObj = error as any
  
  if (errorObj.code) {
    serialized.code = errorObj.code
  }
  
  if (errorObj.cause) {
    serialized.cause = errorObj.cause instanceof Error 
      ? serializeError(errorObj.cause)
      : errorObj.cause
  }
  
  for (const key of Object.keys(errorObj)) {
    if (!['name', 'message', 'stack', 'code', 'cause'].includes(key)) {
      serialized[key] = errorObj[key]
    }
  }
  
  return serialized
}


export const formatJson = (entry: LogEntry): string => {
  const output: Record<string, unknown> = {
    timestamp: entry.timestamp.toISOString(),
    level: entry.level,
    message: entry.message
  }

  if (entry.namespace) {
    output.namespace = entry.namespace
  }

  if (entry.requestId) {
    output.requestId = entry.requestId
  }

  // Nest custom data under 'data' key to avoid conflicts with metadata keys
  // This prevents entry.data.timestamp from overwriting output.timestamp
  if (entry.data && Object.keys(entry.data).length > 0) {
    output.data = entry.data
  }

  if (entry.error) {
    output.error = serializeError(entry.error)
  }

  return safeStringify(output)
}
