import type { LogLevel, LoggerOptions, Logger, Transport, LogEntry, RedactOptions, SamplingOptions, BufferOptions, TraceContext } from './types'
import { isBrowser, isProduction, levelPriority } from './styles'
import { formatBrowser, formatNode, getConsoleMethod } from './formatters'
import { redactData } from './redact'
import { LogBuffer } from './buffer'
import { getDebugFilter } from './env'
import { safeConsole } from './console'
import { getErrorMessage } from './utils'
import { startTimer, endTimer, measure } from './performance'

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

const shouldSample = (level: LogLevel, sampling?: SamplingOptions): boolean => {
  if (!sampling) return true
  
  const rate = sampling[level as keyof SamplingOptions]
  if (rate === undefined) return true
  if (rate >= 1) return true
  if (rate <= 0) return false
  
  return Math.random() < rate
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

const getDefaultFormat = (): 'pretty' | 'json' => {
  return isProduction() ? 'json' : 'pretty'
}

export const createLogger = (options: LoggerOptions = {}): Logger => {
  const config = {
    namespace: options.namespace as string | undefined,
    level: options.level ?? 'debug' as LogLevel,
    timestamp: options.timestamp ?? false,
    enabled: options.enabled ?? true,
    badge: options.badge,
    format: options.format ?? getDefaultFormat(),
    transports: options.transports as Transport[] | undefined,
    context: options.context as Record<string, unknown> | undefined,
    redact: options.redact as RedactOptions | undefined,
    sampling: options.sampling as SamplingOptions | undefined,
    async: options.async ?? false,
    buffer: options.buffer as BufferOptions | undefined,
    requestId: options.requestId as string | undefined,
    trace: options.trace,
  }

  const debugFilter = getDebugFilter()
  
  let logBuffer: LogBuffer | null = null
  if (config.async && config.transports && config.transports.length > 0) {
    logBuffer = new LogBuffer(
      config.transports,
      config.buffer?.size ?? 100,
      config.buffer?.flushInterval ?? 5000
    )
  }

  const logInternal = (level: LogLevel, ...args: unknown[]): void => {
    if (!config.enabled) return
    if (levelPriority[level] < levelPriority[config.level]) return
    if (!matchesFilter(config.namespace, debugFilter)) return
    if (level === 'debug' && isProduction()) return
    if (!shouldSample(level, config.sampling)) return

    // Lazy evaluation: resolve functions only after filters pass
    const resolvedArgs = args.map(arg => typeof arg === 'function' ? arg() : arg)

    if (config.transports && config.transports.length > 0) {
      const { message, data, error } = extractMessage(resolvedArgs)
      
      let mergedData = config.context ? { ...config.context, ...data } : data
      
      if (mergedData && config.redact) {
        mergedData = redactData(mergedData, config.redact)
      }
      
      let traceContext: TraceContext | undefined
      if (config.trace) {
        traceContext = typeof config.trace === 'function' ? config.trace() : config.trace
      }
      
      const entry: LogEntry = {
        timestamp: new Date(),
        level,
        message,
        namespace: config.namespace,
        data: mergedData,
        trace: traceContext,
        error,
        requestId: config.requestId
      }

      if (logBuffer) {
        logBuffer.add(entry)
        return
      }

      // Transports can be sync or async - handle both cases
      for (const transport of config.transports) {
        try {
          const result = transport.log(entry)
          if (result instanceof Promise) {
            result.catch((error) => {
              safeConsole.error(`[logfx] Transport ${transport.name} failed:`, getErrorMessage(error))
            })
          }
        } catch (error) {
          safeConsole.error(`[logfx] Transport ${transport.name} threw error:`, getErrorMessage(error))
        }
      }
      return
    }

    const method = getConsoleMethod(level)

    if (isBrowser) {
      const { prefix, styles, args: formattedArgs } = formatBrowser(level, config, args)
      safeConsole.call(method, prefix, ...styles, ...formattedArgs)
    } else {
      const formattedOutput = formatNode(level, config, args)
      safeConsole.call(method, ...formattedOutput)
    }
  }

  const child = (namespace: string, childOptions: Partial<LoggerOptions> = {}): Logger => {
    const childNamespace = config.namespace
      ? `${config.namespace}:${namespace}`
      : namespace

    const mergedContext = {
      ...config.context,
      ...childOptions.context
    }

    return createLogger({
      ...config,
      ...childOptions,
      namespace: childNamespace,
      context: Object.keys(mergedContext).length > 0 ? mergedContext : undefined,
      requestId: childOptions.requestId ?? config.requestId,
      async: false,
      transports: config.transports
    })
  }

  const flush = async (): Promise<void> => {
    if (logBuffer) {
      try {
        await logBuffer.flush()
      } catch (error) {
        safeConsole.error('[logfx] Buffer flush failed:', getErrorMessage(error))
      }
      return
    }
    
    if (!config.transports) return
    for (const transport of config.transports) {
      if (transport.flush) {
        try {
          await transport.flush()
        } catch (error) {
          safeConsole.error(`[logfx] Transport ${transport.name} flush failed:`, getErrorMessage(error))
        }
      }
    }
  }

  const close = async (): Promise<void> => {
    if (logBuffer) {
      try {
        await logBuffer.close()
      } catch (error) {
        safeConsole.error('[logfx] Buffer close failed:', getErrorMessage(error))
      }
      return
    }
    
    if (!config.transports) return
    for (const transport of config.transports) {
      if (transport.close) {
        try {
          await transport.close()
        } catch (error) {
          safeConsole.error(`[logfx] Transport ${transport.name} close failed:`, getErrorMessage(error))
        }
      }
    }
  }

  const logger: Logger = {
    debug: (...args: unknown[]) => logInternal('debug', ...args),
    info: (...args: unknown[]) => logInternal('info', ...args),
    success: (...args: unknown[]) => logInternal('success', ...args),
    warn: (...args: unknown[]) => logInternal('warn', ...args),
    error: (...args: unknown[]) => logInternal('error', ...args),
    log: (level: LogLevel, ...args: unknown[]) => logInternal(level, ...args),
    child,
    setEnabled: (enabled: boolean) => {
      config.enabled = enabled
    },
    setLevel: (level: LogLevel) => {
      config.level = level
    },
    flush,
    close,
    time: (label: string) => {
      startTimer(label)
      logInternal('debug', `⏱️  ${label} started`)
    },
    timeEnd: (label: string) => {
      const duration = endTimer(label)
      if (duration !== null) {
        logInternal('debug', `⏱️  ${label}: ${duration}ms`)
      }
    },
    measure,
  }
  
  // Add custom level methods
  if (options.customLevels) {
    for (const customLevel of options.customLevels) {
      logger[customLevel.name] = (...args: unknown[]) => logInternal(customLevel.name, ...args)
    }
  }
  
  return logger
}
