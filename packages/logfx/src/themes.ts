export interface Theme {
  debug: string
  info: string
  success: string
  warn: string
  error: string
}

export const themes: Record<string, Theme> = {
  default: {
    debug: '\x1b[90m',
    info: '\x1b[36m',
    success: '\x1b[32m',
    warn: '\x1b[33m',
    error: '\x1b[31m'
  },
  dracula: {
    debug: '\x1b[38;5;241m',
    info: '\x1b[38;5;117m',
    success: '\x1b[38;5;84m',
    warn: '\x1b[38;5;228m',
    error: '\x1b[38;5;203m'
  },
  monokai: {
    debug: '\x1b[38;5;244m',
    info: '\x1b[38;5;81m',
    success: '\x1b[38;5;148m',
    warn: '\x1b[38;5;208m',
    error: '\x1b[38;5;197m'
  }
}

export const getTheme = (name?: string): Theme => {
  return themes[name || 'default'] || themes.default
}
