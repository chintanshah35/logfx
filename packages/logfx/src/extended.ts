import type { BoxOptions, BadgeColor } from './types'
import { isBrowser } from './styles'
import { safeConsole } from './console'
import { safeStringify } from './json'

// Global timers and counters for standalone functions (like console.time/timeEnd)
const globalTimers = new Map<string, number>()
const globalCounters = new Map<string, number>()

// Factory functions to create isolated timers/counters per logger instance
export const createTimerFunctions = () => {
  const timers = new Map<string, number>()
  
  return {
    time: (label: string): void => {
      timers.set(label, performance.now())
    },
    timeEnd: (label: string): void => {
      const start = timers.get(label)
      if (start === undefined) {
        safeConsole.warn(`Timer '${label}' doesn't exist`)
        return
      }
      
      const duration = performance.now() - start
      timers.delete(label)
      
      const formatted = duration < 1000 
        ? `${duration.toFixed(2)}ms`
        : `${(duration / 1000).toFixed(2)}s`
      
      if (isBrowser) {
        safeConsole.log(`%c⏱️ ${label}: ${formatted}`, 'color: #8B5CF6; font-weight: bold;')
      } else {
        safeConsole.log(`\x1b[35m⏱️ ${label}: ${formatted}\x1b[0m`)
      }
    }
  }
}

export const createCounterFunctions = () => {
  const counters = new Map<string, number>()
  
  return {
    count: (label: string): void => {
      const current = counters.get(label) ?? 0
      const newCount = current + 1
      counters.set(label, newCount)
      
      if (isBrowser) {
        safeConsole.log(`%c🔢 ${label}: ${newCount}`, 'color: #06B6D4; font-weight: bold;')
      } else {
        safeConsole.log(`\x1b[36m🔢 ${label}: ${newCount}\x1b[0m`)
      }
    },
    countReset: (label: string): void => {
      counters.delete(label)
    }
  }
}

// Standalone functions (global state, like console.time/timeEnd)
export const time = (label: string): void => {
  globalTimers.set(label, performance.now())
}

export const timeEnd = (label: string): void => {
  const start = globalTimers.get(label)
  if (start === undefined) {
    safeConsole.warn(`Timer '${label}' doesn't exist`)
    return
  }
  
  const duration = performance.now() - start
  globalTimers.delete(label)
  
  const formatted = duration < 1000 
    ? `${duration.toFixed(2)}ms`
    : `${(duration / 1000).toFixed(2)}s`
  
  if (isBrowser) {
    safeConsole.log(`%c⏱️ ${label}: ${formatted}`, 'color: #8B5CF6; font-weight: bold;')
  } else {
    safeConsole.log(`\x1b[35m⏱️ ${label}: ${formatted}\x1b[0m`)
  }
}

export const count = (label: string): void => {
  const current = globalCounters.get(label) ?? 0
  const newCount = current + 1
  globalCounters.set(label, newCount)
  
  if (isBrowser) {
    safeConsole.log(`%c🔢 ${label}: ${newCount}`, 'color: #06B6D4; font-weight: bold;')
  } else {
    safeConsole.log(`\x1b[36m🔢 ${label}: ${newCount}\x1b[0m`)
  }
}

export const countReset = (label: string): void => {
  globalCounters.delete(label)
}

// Groups
export const group = (label: string): void => {
  if (isBrowser) {
    safeConsole.group(label)
  } else {
    safeConsole.log(`\x1b[1m${label}\x1b[0m`)
    safeConsole.group(label)
  }
}

export const groupCollapsed = (label: string): void => {
  if (isBrowser) {
    safeConsole.groupCollapsed(label)
  } else {
    safeConsole.log(`\x1b[1m${label} (collapsed)\x1b[0m`)
  }
}

export const groupEnd = (): void => {
  safeConsole.groupEnd()
}

// Assert - logs only when condition is false
export const assert = (condition: boolean, ...args: unknown[]): void => {
  if (!condition) {
    if (isBrowser) {
      safeConsole.log('%cAssertion failed:', 'color: #EF4444; font-weight: bold;', ...args)
    } else {
      safeConsole.log('\x1b[31mAssertion failed:\x1b[0m', ...args)
    }
  }
}

// Box
const boxChars = {
  single: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
  double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
  round: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
}

const boxColors: Record<string, string> = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
}

export const box = (message: string | string[], options: BoxOptions = {}): void => {
  const { title, padding = 1, borderColor = 'cyan', borderStyle = 'round' } = options
  const disableColors = getColorsDisabled()

  const lines = Array.isArray(message) ? message : [message]
  const chars = boxChars[borderStyle]
  const color = disableColors ? '' : (boxColors[borderColor] || boxColors.cyan)
  const reset = disableColors ? '' : '\x1b[0m'

  const contentWidth = Math.max(...lines.map(l => l.length), title ? title.length : 0)
  const boxWidth = contentWidth + (padding * 2) + 2
  const horizontalLine = chars.h.repeat(boxWidth - 2)
  const emptyLine = chars.v + ' '.repeat(boxWidth - 2) + chars.v
  const paddingStr = ' '.repeat(padding)

  const output: string[] = []

  // Top border
  if (title) {
    const titleLine = `${chars.tl}${chars.h} ${title} ${chars.h.repeat(boxWidth - title.length - 5)}${chars.tr}`
    output.push(color + titleLine + reset)
  } else {
    output.push(color + chars.tl + horizontalLine + chars.tr + reset)
  }

  // Padding
  for (let i = 0; i < padding; i++) {
    output.push(color + emptyLine + reset)
  }

  // Content
  for (const line of lines) {
    const paddedLine = line.padEnd(contentWidth)
    output.push(color + chars.v + reset + paddingStr + paddedLine + paddingStr + color + chars.v + reset)
  }

  // Padding
  for (let i = 0; i < padding; i++) {
    output.push(color + emptyLine + reset)
  }

  // Bottom border
  output.push(color + chars.bl + horizontalLine + chars.br + reset)

  safeConsole.log('\n' + output.join('\n') + '\n')
}

// Table
export const table = (data: Record<string, unknown>[] | Record<string, unknown>): void => {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    safeConsole.log('(empty)')
    return
  }

  const disableColors = getColorsDisabled()
  const rows = Array.isArray(data) ? data : [data]
  const keys = [...new Set(rows.flatMap(row => Object.keys(row)))]
  
  const colWidths: Record<string, number> = {}
  for (const key of keys) {
    colWidths[key] = Math.max(key.length, ...rows.map(row => String(row[key] ?? '').length))
  }

  const color = disableColors ? '' : '\x1b[36m'
  const reset = disableColors ? '' : '\x1b[0m'
  const sep = '─'

  const topBorder = `┌${keys.map(k => sep.repeat(colWidths[k] + 2)).join('┬')}┐`
  const headerSep = keys.map(k => sep.repeat(colWidths[k] + 2)).join('┼')
  const bottomBorder = `└${keys.map(k => sep.repeat(colWidths[k] + 2)).join('┴')}┘`

  const output: string[] = []
  
  output.push(color + topBorder + reset)
  
  const header = keys.map(k => ` ${k.padEnd(colWidths[k])} `).join(color + '│' + reset)
  output.push(color + '│' + reset + header + color + '│' + reset)
  output.push(color + `├${headerSep}┤` + reset)
  
  for (const row of rows) {
    const cells = keys.map(k => ` ${String(row[k] ?? '').padEnd(colWidths[k])} `).join(color + '│' + reset)
    output.push(color + '│' + reset + cells + color + '│' + reset)
  }
  
  output.push(color + bottomBorder + reset)

  safeConsole.log('\n' + output.join('\n') + '\n')
}


// Check if colors should be disabled (same logic as formatters)
const shouldDisableColors = (): boolean => {
  if (typeof process !== 'undefined' && process.env?.NO_COLOR) {
    return true
  }
  if (typeof process !== 'undefined' && process.env?.FORCE_COLOR === '1') {
    return false
  }
  if (typeof process !== 'undefined' && process.env) {
    const ciEnvVars = ['CI', 'CONTINUOUS_INTEGRATION', 'BUILD_NUMBER', 'RUN_ID']
    for (const envVar of ciEnvVars) {
      if (process.env[envVar]) {
        return true
      }
    }
  }
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

// Diff
export const diff = (
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  label = 'Changes'
): void => {
  const allKeys = [...new Set([...Object.keys(before), ...Object.keys(after)])]
  const disableColors = getColorsDisabled()
  
  const changes: string[] = []
  const added: string[] = []
  const removed: string[] = []

  for (const key of allKeys) {
    const beforeVal = before[key]
    const afterVal = after[key]

    if (!(key in before)) {
      if (disableColors) {
        added.push(`  + ${key}: ${safeStringify(afterVal)}`)
      } else {
        added.push(`  \x1b[32m+ ${key}: ${safeStringify(afterVal)}\x1b[0m`)
      }
    } else if (!(key in after)) {
      if (disableColors) {
        removed.push(`  - ${key}: ${safeStringify(beforeVal)}`)
      } else {
        removed.push(`  \x1b[31m- ${key}: ${safeStringify(beforeVal)}\x1b[0m`)
      }
    } else {
      const beforeStr = safeStringify(beforeVal)
      const afterStr = safeStringify(afterVal)
      if (beforeStr !== afterStr) {
        if (disableColors) {
          changes.push(`  ~ ${key}: ${beforeStr} → ${afterStr}`)
        } else {
          changes.push(`  \x1b[33m~ ${key}: ${beforeStr} → ${afterStr}\x1b[0m`)
        }
      }
    }
  }

  if (changes.length === 0 && added.length === 0 && removed.length === 0) {
    if (disableColors) {
      safeConsole.log(`${label}: (no changes)`)
    } else {
      safeConsole.log(`\x1b[90m${label}: (no changes)\x1b[0m`)
    }
    return
  }

  if (disableColors) {
    safeConsole.log(`${label}:`)
  } else {
    safeConsole.log(`\x1b[1m${label}:\x1b[0m`)
  }
  for (const line of [...changes, ...added, ...removed]) {
    safeConsole.log(line)
  }
}

// Badge
const badgeColors: Record<BadgeColor, { bg: string; fg: string }> = {
  red: { bg: '\x1b[41m', fg: '\x1b[37m' },
  green: { bg: '\x1b[42m', fg: '\x1b[30m' },
  yellow: { bg: '\x1b[43m', fg: '\x1b[30m' },
  blue: { bg: '\x1b[44m', fg: '\x1b[37m' },
  magenta: { bg: '\x1b[45m', fg: '\x1b[37m' },
  cyan: { bg: '\x1b[46m', fg: '\x1b[30m' },
  white: { bg: '\x1b[47m', fg: '\x1b[30m' },
  gray: { bg: '\x1b[100m', fg: '\x1b[37m' },
}

export const badge = (text: string, color: BadgeColor = 'blue'): void => {
  const disableColors = getColorsDisabled()
  const colors = badgeColors[color] || badgeColors.blue
  const reset = disableColors ? '' : '\x1b[0m'
  
  if (isBrowser) {
    const cssColors: Record<BadgeColor, string> = {
      red: '#EF4444', green: '#10B981', yellow: '#F59E0B', blue: '#3B82F6',
      magenta: '#8B5CF6', cyan: '#06B6D4', white: '#F3F4F6', gray: '#6B7280',
    }
    safeConsole.log(
      `%c ${text} `,
      `background: ${cssColors[color]}; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold;`
    )
  } else {
    if (disableColors) {
      safeConsole.log(` ${text} `)
    } else {
      safeConsole.log(`${colors.bg}${colors.fg} ${text} ${reset}`)
    }
  }
}
