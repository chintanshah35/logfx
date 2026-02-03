import type { RedactOptions, PIIPattern } from './types'

const DEFAULT_CENSOR = '[REDACTED]'

const PII_PATTERNS: Record<PIIPattern, RegExp> = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  phone: /\b(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
  ip: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  jwt: /\beyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\b/g
}

const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
  const parts = path.split('.')
  let current: unknown = obj
  
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }
  
  return current
}

const setNestedValue = (obj: Record<string, unknown>, path: string, value: unknown): void => {
  const parts = path.split('.')
  let current: Record<string, unknown> = obj
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (current[part] === null || current[part] === undefined || typeof current[part] !== 'object') {
      return
    }
    current = current[part] as Record<string, unknown>
  }
  
  const lastPart = parts[parts.length - 1]
  if (lastPart in current) {
    current[lastPart] = value
  }
}

const redactKeys = (
  obj: Record<string, unknown>,
  keys: string[],
  censor: string
): Record<string, unknown> => {
  const result: Record<string, unknown> = {}
  
  for (const [key, value] of Object.entries(obj)) {
    if (keys.includes(key)) {
      result[key] = censor
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = redactKeys(value as Record<string, unknown>, keys, censor)
    } else if (Array.isArray(value)) {
      result[key] = value.map(item => 
        item !== null && typeof item === 'object' 
          ? redactKeys(item as Record<string, unknown>, keys, censor)
          : item
      )
    } else {
      result[key] = value
    }
  }
  
  return result
}

// Safe deep clone that handles circular references
const deepClone = (obj: Record<string, unknown>): Record<string, unknown> => {
  const seen = new WeakMap()
  
  const clone = (value: unknown): unknown => {
    if (value === null || typeof value !== 'object') {
      return value
    }
    
    if (seen.has(value)) {
      return '[Circular]'
    }
    
    if (Array.isArray(value)) {
      const arr: unknown[] = []
      seen.set(value, arr)
      for (const item of value) {
        arr.push(clone(item))
      }
      return arr
    }
    
    const cloned: Record<string, unknown> = {}
    seen.set(value, cloned)
    for (const [key, val] of Object.entries(value)) {
      cloned[key] = clone(val)
    }
    return cloned
  }
  
  return clone(obj) as Record<string, unknown>
}

export const redactData = (
  data: Record<string, unknown>,
  options: RedactOptions
): Record<string, unknown> => {
  if (!options.keys?.length && !options.paths?.length) {
    return data
  }
  
  const censor = options.censor ?? DEFAULT_CENSOR
  
  // Deep clone for nested modifications (handles circular references)
  let result = deepClone(data)
  
  // Redact by key names (recursive)
  if (options.keys?.length) {
    result = redactKeys(result, options.keys, censor)
  }
  
  // Redact by specific paths
  if (options.paths?.length) {
    for (const path of options.paths) {
      if (getNestedValue(result, path) !== undefined) {
        setNestedValue(result, path, censor)
      }
    }
  }
  
  return result
}
