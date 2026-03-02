import type { LogLevel, LogStyle, CustomLevel } from './types'
import { isProduction } from './env'

export const isBrowser = typeof window !== 'undefined'

export { isProduction }

const defaultStyle: LogStyle = {
  emoji: '📋',
  color: '#6B7280',
  bgColor: '#F3F4F6',
  label: 'LOG',
}

const defaultAnsiColor = {
  fg: '\x1b[36m',
  bg: '\x1b[46m',
  reset: '\x1b[0m',
}

const builtinStyles: Record<string, LogStyle> = {
  debug: { emoji: '🔍', color: '#6B7280', bgColor: '#F3F4F6', label: 'DEBUG' },
  info: { emoji: '💡', color: '#10B981', bgColor: '#D1FAE5', label: 'INFO' },
  success: { emoji: '✅', color: '#10B981', bgColor: '#D1FAE5', label: 'SUCCESS' },
  warn: { emoji: '⚠️', color: '#F59E0B', bgColor: '#FEF3C7', label: 'WARN' },
  error: { emoji: '🔴', color: '#EF4444', bgColor: '#FEE2E2', label: 'ERROR' },
}

const builtinAnsiColors: Record<string, { fg: string; bg: string; reset: string }> = {
  debug: { fg: '\x1b[90m', bg: '\x1b[100m', reset: '\x1b[0m' },
  info: { fg: '\x1b[32m', bg: '\x1b[42m', reset: '\x1b[0m' },
  success: { fg: '\x1b[32m', bg: '\x1b[42m', reset: '\x1b[0m' },
  warn: { fg: '\x1b[33m', bg: '\x1b[43m', reset: '\x1b[0m' },
  error: { fg: '\x1b[31m', bg: '\x1b[41m', reset: '\x1b[0m' },
}

const builtinPriority: Record<string, number> = {
  debug: 0,
  info: 1,
  success: 2,
  warn: 3,
  error: 4,
}

export const getStyle = (level: LogLevel): LogStyle =>
  builtinStyles[level] ?? defaultStyle

export const getAnsiColor = (level: LogLevel): { fg: string; bg: string; reset: string } =>
  builtinAnsiColors[level] ?? defaultAnsiColor

export const getLevelPriority = (level: LogLevel): number =>
  builtinPriority[level] ?? 1

export const registerCustomLevels = (customLevels: CustomLevel[]): void => {
  for (const custom of customLevels) {
    builtinPriority[custom.name] = custom.priority
    if (custom.style) {
      builtinStyles[custom.name] = {
        emoji: custom.style.emoji ?? defaultStyle.emoji,
        color: custom.style.color ?? defaultStyle.color,
        bgColor: custom.style.bgColor ?? defaultStyle.bgColor,
        label: custom.style.label ?? custom.name.toUpperCase(),
      }
    }
  }
}

const resolveStyle = (target: Record<string, LogStyle>, prop: string | symbol): LogStyle => {
  if (typeof prop !== 'string') return defaultStyle
  return target[prop] ?? { ...defaultStyle, label: prop.toUpperCase() }
}

const resolveAnsiColor = (target: Record<string, { fg: string; bg: string; reset: string }>, prop: string | symbol) => {
  if (typeof prop !== 'string') return defaultAnsiColor
  return target[prop] ?? defaultAnsiColor
}

const resolvePriority = (target: Record<string, number>, prop: string | symbol): number => {
  if (typeof prop !== 'string') return 1
  return target[prop] ?? 1
}

export const styles: Record<LogLevel, LogStyle> = new Proxy(builtinStyles as Record<LogLevel, LogStyle>, {
  get: (target, prop) => resolveStyle(target, prop)
})

export const ansiColors: Record<LogLevel, { fg: string; bg: string; reset: string }> = new Proxy(
  builtinAnsiColors as Record<LogLevel, { fg: string; bg: string; reset: string }>,
  { get: (target, prop) => resolveAnsiColor(target, prop) }
)

export const levelPriority: Record<LogLevel, number> = new Proxy(
  builtinPriority as Record<LogLevel, number>,
  { get: (target, prop) => resolvePriority(target, prop) }
)

