import type { LogLevel, LoggerOptions, Logger, Transport, LogEntry } from './types'
import { isBrowser, isProduction, levelPriority } from './styles'
import { formatBrowser, formatNode, getConsoleMethod } from './formatters'

const getDebugFilter = (): string | null => {
  if (typeof process !== 'undefined' && process.env?.DEBUG) {
    return process.env.DEBUG
  }
  if (isBrowser && typeof localStorage !== 'undefined') {
    return localStorage.getItem('DEBUG')
  }
  return null
}

const matchesFilter = (namespace: string | undefined, filter: string | null): boolean => {
  if (!filter) return true
  if (!namespace) return filter === '*'

  const patterns = filter.split(',').map((p) => p.trim())

  for (const pattern of patterns) {
    if (pattern === '*') return true
    if (pattern === namespace) return true

    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1)
      if (namespace.startsWith(prefix)) return true
    }

    if (pattern.startsWith('-')) {
      const excluded = pattern.slice(1)
      if (namespace === excluded || namespace.startsWith(excluded + ':')) {
        return false
      }
    }
  }

  return false
}

const extractMessage = (args: unknown[]): { message: string; data?: Record<string, unknown>; error?: Error } => {
  let message = ''
  let data: Record<string, unknown> | undefined
  let error: Error | undefined

  for (const arg of args) {
    if (typeof arg === 'string') {
      message = message ? `${message} ${arg}` : arg
    } else if (arg instanceof Error) {
      error = arg
      if (!message) message = arg.message
    } else if (typeof arg === 'object' && arg !== null) {
      data = { ...data, ...arg as Record<string, unknown> }
    } else {
      message = message ? `${message} ${String(arg)}` : String(arg)
    }
  }

  return { message, data, error }
}

export const createLogger = (options: LoggerOptions = {}): Logger => {
  const config = {
    namespace: options.namespace as string | undefined,
    level: options.level ?? 'debug' as LogLevel,
    timestamp: options.timestamp ?? false,
    enabled: options.enabled ?? !isProduction(),
    badge: options.badge,
    format: options.format ?? 'pretty' as const,
    transports: options.transports as Transport[] | undefined,
  }

  const debugFilter = getDebugFilter()

  const logInternal = (level: LogLevel, ...args: unknown[]): void => {
    if (!config.enabled) return
    if (levelPriority[level] < levelPriority[config.level]) return
    if (!matchesFilter(config.namespace, debugFilter)) return
    if (level === 'debug' && isProduction()) return

    // Use transports if configured
    if (config.transports && config.transports.length > 0) {
      const { message, data, error } = extractMessage(args)
      const entry: LogEntry = {
        timestamp: new Date(),
        level,
        message,
        namespace: config.namespace,
        data,
        error
      }

      for (const transport of config.transports) {
        transport.log(entry)
      }
      return
    }

    // Legacy pretty output
    const method = getConsoleMethod(level)

    if (isBrowser) {
      const { prefix, styles, args: formattedArgs } = formatBrowser(level, config, args)
      console[method](prefix, ...styles, ...formattedArgs)
    } else {
      const formattedOutput = formatNode(level, config, args)
      console[method](...formattedOutput)
    }
  }

  const child = (namespace: string, childOptions: Partial<LoggerOptions> = {}): Logger => {
    const childNamespace = config.namespace
      ? `${config.namespace}:${namespace}`
      : namespace

    return createLogger({
      ...config,
      ...childOptions,
      namespace: childNamespace,
    })
  }

  const flush = async (): Promise<void> => {
    if (!config.transports) return
    for (const transport of config.transports) {
      if (transport.flush) {
        await transport.flush()
      }
    }
  }

  return {
    debug: (...args: unknown[]) => logInternal('debug', ...args),
    info: (...args: unknown[]) => logInternal('info', ...args),
    success: (...args: unknown[]) => logInternal('success', ...args),
    warn: (...args: unknown[]) => logInternal('warn', ...args),
    error: (...args: unknown[]) => logInternal('error', ...args),
    child,
    setEnabled: (enabled: boolean) => {
      config.enabled = enabled
    },
    setLevel: (level: LogLevel) => {
      config.level = level
    },
    flush,
  }
}
