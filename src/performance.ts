const timers = new Map<string, number>()

export const startTimer = (label: string): void => {
  timers.set(label, Date.now())
}

export const endTimer = (label: string): number | null => {
  const start = timers.get(label)
  if (!start) return null
  
  const duration = Date.now() - start
  timers.delete(label)
  return duration
}

export const measure = async <T>(fn: () => T | Promise<T>): Promise<{ result: T; duration: number }> => {
  const start = Date.now()
  const result = await fn()
  const duration = Date.now() - start
  return { result, duration }
}
