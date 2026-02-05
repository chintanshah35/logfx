import type { TraceContext } from './types'

export const generateTraceId = (): string => {
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

export const generateSpanId = (): string => {
  const bytes = new Uint8Array(8)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 8; i++) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

export const createTraceContext = (parentContext?: TraceContext): TraceContext => {
  return {
    traceId: parentContext?.traceId ?? generateTraceId(),
    spanId: generateSpanId(),
    parentSpanId: parentContext?.spanId,
    traceFlags: parentContext?.traceFlags ?? 1
  }
}

export const parseW3CTraceParent = (traceparent: string): TraceContext | null => {
  const parts = traceparent.split('-')
  if (parts.length !== 4 || parts[0] !== '00') {
    return null
  }
  
  return {
    traceId: parts[1],
    spanId: parts[2],
    traceFlags: parseInt(parts[3], 16)
  }
}

export const formatW3CTraceParent = (context: TraceContext): string => {
  if (!context.traceId || !context.spanId) {
    throw new Error('traceId and spanId are required')
  }
  
  const flags = (context.traceFlags ?? 1).toString(16).padStart(2, '0')
  return `00-${context.traceId}-${context.spanId}-${flags}`
}
