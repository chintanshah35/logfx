import { describe, it, expect } from 'vitest'
import { generateTraceId, generateSpanId, createTraceContext, parseW3CTraceParent, formatW3CTraceParent } from '../src/trace'

describe('Trace Utilities', () => {
  it('generates valid trace IDs', () => {
    const traceId = generateTraceId()
    expect(traceId).toHaveLength(32)
    expect(traceId).toMatch(/^[0-9a-f]{32}$/)
  })

  it('generates valid span IDs', () => {
    const spanId = generateSpanId()
    expect(spanId).toHaveLength(16)
    expect(spanId).toMatch(/^[0-9a-f]{16}$/)
  })

  it('creates trace context without parent', () => {
    const context = createTraceContext()
    expect(context.traceId).toHaveLength(32)
    expect(context.spanId).toHaveLength(16)
    expect(context.parentSpanId).toBeUndefined()
    expect(context.traceFlags).toBe(1)
  })

  it('creates trace context with parent', () => {
    const parent = createTraceContext()
    const child = createTraceContext(parent)
    
    expect(child.traceId).toBe(parent.traceId)
    expect(child.spanId).not.toBe(parent.spanId)
    expect(child.parentSpanId).toBe(parent.spanId)
  })

  it('parses W3C traceparent header', () => {
    const traceparent = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01'
    const context = parseW3CTraceParent(traceparent)
    
    expect(context).not.toBeNull()
    expect(context?.traceId).toBe('0af7651916cd43dd8448eb211c80319c')
    expect(context?.spanId).toBe('b7ad6b7169203331')
    expect(context?.traceFlags).toBe(1)
  })

  it('returns null for invalid traceparent', () => {
    expect(parseW3CTraceParent('invalid')).toBeNull()
    expect(parseW3CTraceParent('01-abc-def-01')).toBeNull()
  })

  it('formats W3C traceparent header', () => {
    const context = {
      traceId: '0af7651916cd43dd8448eb211c80319c',
      spanId: 'b7ad6b7169203331',
      traceFlags: 1
    }
    
    const traceparent = formatW3CTraceParent(context)
    expect(traceparent).toBe('00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01')
  })

  it('throws error for incomplete context', () => {
    expect(() => formatW3CTraceParent({ traceId: 'abc' })).toThrow()
    expect(() => formatW3CTraceParent({ spanId: 'def' })).toThrow()
  })
})
