export type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error'

export type LogFormat = 'pretty' | 'json'

export interface LogEntry {
  timestamp: Date
  level: LogLevel
  message: string
  namespace?: string
  data?: Record<string, unknown>
  error?: Error
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

export interface FileTransportOptions {
  path: string
  format?: LogFormat
}

export interface WebhookTransportOptions {
  url: string
  headers?: Record<string, string>
  method?: 'POST' | 'PUT'
  batchSize?: number
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
  flush?: () => Promise<void>
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
