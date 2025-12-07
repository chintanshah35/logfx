export type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error'

export interface LoggerOptions {
  namespace?: string
  level?: LogLevel
  timestamp?: boolean
  enabled?: boolean
  badge?: string
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
