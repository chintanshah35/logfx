import type { BoxOptions, BadgeColor } from './types'
import { isBrowser } from './styles'

// Timers
const timers = new Map<string, number>()

export const time = (label: string): void => {
  timers.set(label, performance.now())
}

export const timeEnd = (label: string): void => {
  const start = timers.get(label)
  if (start === undefined) {
    console.warn(`Timer '${label}' doesn't exist`)
    return
  }
  
  const duration = performance.now() - start
  timers.delete(label)
  
  const formatted = duration < 1000 
    ? `${duration.toFixed(2)}ms`
    : `${(duration / 1000).toFixed(2)}s`
  
  if (isBrowser) {
    console.log(`%c⏱️ ${label}: ${formatted}`, 'color: #8B5CF6; font-weight: bold;')
  } else {
    console.log(`\x1b[35m⏱️ ${label}: ${formatted}\x1b[0m`)
  }
}

// Counters
const counters = new Map<string, number>()

export const count = (label: string): void => {
  const current = counters.get(label) ?? 0
  const newCount = current + 1
  counters.set(label, newCount)
  
  if (isBrowser) {
    console.log(`%c🔢 ${label}: ${newCount}`, 'color: #06B6D4; font-weight: bold;')
  } else {
    console.log(`\x1b[36m🔢 ${label}: ${newCount}\x1b[0m`)
  }
}

export const countReset = (label: string): void => {
  counters.delete(label)
}

// Groups
export const group = (label: string): void => {
  if (isBrowser) {
    console.group(`📁 ${label}`)
  } else {
    console.log(`\x1b[1m📁 ${label}\x1b[0m`)
    console.group()
  }
}

export const groupCollapsed = (label: string): void => {
  if (isBrowser) {
    console.groupCollapsed(`📁 ${label}`)
  } else {
    console.log(`\x1b[1m📁 ${label} (collapsed)\x1b[0m`)
  }
}

export const groupEnd = (): void => {
  console.groupEnd()
}

// Assert - logs only when condition is false
export const assert = (condition: boolean, ...args: unknown[]): void => {
  if (!condition) {
    if (isBrowser) {
      console.log('%c❌ Assertion failed:', 'color: #EF4444; font-weight: bold;', ...args)
    } else {
      console.log('\x1b[31m❌ Assertion failed:\x1b[0m', ...args)
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

  const lines = Array.isArray(message) ? message : [message]
  const chars = boxChars[borderStyle]
  const color = boxColors[borderColor] || boxColors.cyan
  const reset = '\x1b[0m'

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

  console.log('\n' + output.join('\n') + '\n')
}

// Table
export const table = (data: Record<string, unknown>[] | Record<string, unknown>): void => {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    console.log('(empty)')
    return
  }

  const rows = Array.isArray(data) ? data : [data]
  const keys = [...new Set(rows.flatMap(row => Object.keys(row)))]
  
  const colWidths: Record<string, number> = {}
  for (const key of keys) {
    colWidths[key] = Math.max(key.length, ...rows.map(row => String(row[key] ?? '').length))
  }

  const color = '\x1b[36m'
  const reset = '\x1b[0m'
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

  console.log('\n' + output.join('\n') + '\n')
}

// Diff
export const diff = (
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  label = 'Changes'
): void => {
  const allKeys = [...new Set([...Object.keys(before), ...Object.keys(after)])]
  
  const changes: string[] = []
  const added: string[] = []
  const removed: string[] = []

  for (const key of allKeys) {
    const beforeVal = before[key]
    const afterVal = after[key]

    if (!(key in before)) {
      added.push(`  \x1b[32m+ ${key}: ${JSON.stringify(afterVal)}\x1b[0m`)
    } else if (!(key in after)) {
      removed.push(`  \x1b[31m- ${key}: ${JSON.stringify(beforeVal)}\x1b[0m`)
    } else if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      changes.push(`  \x1b[33m~ ${key}: ${JSON.stringify(beforeVal)} → ${JSON.stringify(afterVal)}\x1b[0m`)
    }
  }

  if (changes.length === 0 && added.length === 0 && removed.length === 0) {
    console.log(`\x1b[90m📝 ${label}: (no changes)\x1b[0m`)
    return
  }

  console.log(`\x1b[1m📝 ${label}:\x1b[0m`)
  for (const line of [...changes, ...added, ...removed]) {
    console.log(line)
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
  const colors = badgeColors[color] || badgeColors.blue
  const reset = '\x1b[0m'
  
  if (isBrowser) {
    const cssColors: Record<BadgeColor, string> = {
      red: '#EF4444', green: '#10B981', yellow: '#F59E0B', blue: '#3B82F6',
      magenta: '#8B5CF6', cyan: '#06B6D4', white: '#F3F4F6', gray: '#6B7280',
    }
    console.log(
      `%c ${text} `,
      `background: ${cssColors[color]}; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold;`
    )
  } else {
    console.log(`${colors.bg}${colors.fg} ${text} ${reset}`)
  }
}
