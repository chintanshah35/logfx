import type { LogLevel, LoggerOptions, Logger } from './types'
import { isBrowser, isProduction, levelPriority } from './styles'
import { formatBrowser, formatNode, getConsoleMethod } from './formatters'

/**
 * Global debug filter (similar to 'debug' package)
 * Set via DEBUG environment variable or localStorage
 */
const getDebugFilter = (): string | null => {
  if (typeof process !== 'undefined' && process.env?.DEBUG) {
    return process.env.DEBUG
  }
  if (isBrowser && typeof localStorage !== 'undefined') {
    return localStorage.getItem('DEBUG')
  }
  return null
}

/**
 * Check if a namespace matches the debug filter
 */
const matchesFilter = (namespace: string | undefined, filter: string | null): boolean => {
  if (!filter) return true
  if (!namespace) return filter === '*'

  const patterns = filter.split(',').map((p) => p.trim())

  for (const pattern of patterns) {
    if (pattern === '*') return true
    if (pattern === namespace) return true

    // Simple wildcard matching (e.g., 'auth:*' matches 'auth:login')
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1)
      if (namespace.startsWith(prefix)) return true
    }

    // Negative pattern (e.g., '-auth' excludes 'auth')
    if (pattern.startsWith('-')) {
      const excluded = pattern.slice(1)
      if (namespace === excluded || namespace.startsWith(excluded + ':')) {
        return false
      }
    }
  }

  return false
}

/**
 * Create a logger instance
 */
export const createLogger = (options: LoggerOptions = {}): Logger => {
  const config = {
    namespace: options.namespace as string | undefined,
    level: options.level ?? 'debug' as LogLevel,
    timestamp: options.timestamp ?? false,
    enabled: options.enabled ?? !isProduction(),
    badge: options.badge,
  }

  const debugFilter = getDebugFilter()

  /**
   * Internal log function
   */
  const logInternal = (level: LogLevel, ...args: unknown[]): void => {
    // Check if logging is enabled
    if (!config.enabled) return

    // Check log level priority
    if (levelPriority[level] < levelPriority[config.level]) return

    // Check debug filter
    if (!matchesFilter(config.namespace, debugFilter)) return

    // Auto-hide debug in production
    if (level === 'debug' && isProduction()) return

    const method = getConsoleMethod(level)

    if (isBrowser) {
      const { prefix, styles, args: formattedArgs } = formatBrowser(level, config, args)
      console[method](prefix, ...styles, ...formattedArgs)
    } else {
      const formattedOutput = formatNode(level, config, args)
      console[method](...formattedOutput)
    }
  }

  /**
   * Create child logger with namespace
   */
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
  }
}

