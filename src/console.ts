// Safe console calls for environments where console might not exist

const hasConsole = typeof console !== 'undefined'

export const safeConsole = {
  log: (...args: unknown[]) => hasConsole && console.log?.(...args),
  warn: (...args: unknown[]) => hasConsole && console.warn?.(...args),
  error: (...args: unknown[]) => hasConsole && console.error?.(...args),
  debug: (...args: unknown[]) => hasConsole && console.debug?.(...args),
  info: (...args: unknown[]) => hasConsole && console.info?.(...args),
  group: (label: string) => hasConsole && console.group?.(label),
  groupCollapsed: (label: string) => hasConsole && console.groupCollapsed?.(label),
  groupEnd: () => hasConsole && console.groupEnd?.(),
  call: (method: string, ...args: unknown[]) => {
    if (hasConsole && typeof console[method as keyof Console] === 'function') {
      (console[method as keyof Console] as (...args: unknown[]) => void)(...args)
    }
  }
}
