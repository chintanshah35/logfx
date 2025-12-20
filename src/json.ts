// Safe JSON stringify with circular reference and BigInt handling

export const safeStringify = (value: unknown, space?: number): string => {
  const seen = new WeakSet<object>()
  
  const replacer = (_key: string, val: unknown): unknown => {
    if (typeof val === 'bigint') {
      return val.toString() + 'n'
    }
    
    if (typeof val === 'object' && val !== null) {
      if (seen.has(val)) {
        return '[Circular]'
      }
      seen.add(val)
    }
    
    return val
  }
  
  try {
    return JSON.stringify(value, replacer, space)
  } catch {
    try {
      return String(value)
    } catch {
      return '[Unserializable]'
    }
  }
}
