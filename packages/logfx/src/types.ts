export type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error'

export type LogFormat = 'pretty' | 'json'

export interface LogEntry {
  timestamp: Date
  level: LogLevel
  message: string
  namespace?: string
  data?: Record<string, unknown>
  error?: Error
  requestId?: string
}

export interface Transport {
  name: string
  log: (entry: LogEntry) => void | Promise<void>
  flush?: () => void | Promise<void>
  close?: () => void | Promise<void>
}

export interface ConsoleTransportOptions {
  format?: LogFormat
  colors?: boolean
  timestamps?: boolean
}

export interface RotationOptions {
  maxSize?: number | string
  maxFiles?: number
  compress?: boolean
}

export interface FileTransportOptions {
  path: string
  format?: LogFormat
  rotation?: RotationOptions
}

export interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoff?: 'exponential' | 'linear' | 'fixed'
  retryOn?: (number | string)[]
}

export interface CircuitBreakerOptions {
  enabled?: boolean
  threshold?: number
  timeout?: number
  halfOpenRequests?: number
}

export interface DeadLetterQueueOptions {
  enabled?: boolean
  maxSize?: number
  onFull?: 'drop-oldest' | 'drop-newest'
  persist?: string
}

export interface WebhookTransportOptions {
  url: string
  headers?: Record<string, string>
  method?: 'POST' | 'PUT'
  batchSize?: number
  flushInterval?: number
  maxBufferSize?: number
  timeout?: number
  retry?: RetryOptions
  circuitBreaker?: CircuitBreakerOptions
  dlq?: DeadLetterQueueOptions
}

export interface RedactOptions {
  paths?: string[]
  keys?: string[]
  censor?: string
}

export interface SamplingOptions {
  debug?: number
  info?: number
  success?: number
  warn?: number
  error?: number
}

export interface BufferOptions {
  size?: number
  flushInterval?: number
}

export interface LoggerOptions {
  namespace?: string
  level?: LogLevel
  timestamp?: boolean
  enabled?: boolean
  badge?: string
  format?: LogFormat
  transports?: Transport[]
  context?: Record<string, unknown>
  redact?: RedactOptions
  sampling?: SamplingOptions
  async?: boolean
  buffer?: BufferOptions
  requestId?: string
  theme?: string
  detectIssues?: boolean
}

export interface LogStyle {
  emoji: string
  color: string
  bgColor: string
  label: string
}

export interface BoxOptions {
  title?: string
  padding?: number
  borderColor?: 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'gray'
  borderStyle?: 'single' | 'double' | 'round'
}

export type BadgeColor = 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'gray'

export interface Logger {
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  success: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
  child: (namespace: string, options?: Partial<LoggerOptions>) => Logger
  setEnabled: (enabled: boolean) => void
  setLevel: (level: LogLevel) => void
  flush: () => Promise<void>
  close: () => Promise<void>
  time: (label: string) => void
  timeEnd: (label: string) => void
  measure: <T>(fn: () => T | Promise<T>) => Promise<{ result: T; duration: number }>
}

export interface ExtendedLogger extends Logger {
  time: (label: string) => void
  timeEnd: (label: string) => void
  count: (label: string) => void
  countReset: (label: string) => void
  group: (label: string) => void
  groupCollapsed: (label: string) => void
  groupEnd: () => void
  assert: (condition: boolean, ...args: unknown[]) => void
  box: (message: string | string[], options?: BoxOptions) => void
  table: (data: Record<string, unknown>[] | Record<string, unknown>) => void
  diff: (before: Record<string, unknown>, after: Record<string, unknown>, label?: string) => void
  badge: (text: string, color?: BadgeColor) => void
}
