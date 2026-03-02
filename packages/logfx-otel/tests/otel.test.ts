import { describe, it, expect, vi, beforeEach } from 'vitest'
import { otelTransport, getTraceContextFromOtel } from '../src/index'
import { trace, SpanStatusCode } from '@opentelemetry/api'

describe('OTel Transport', () => {
  const mockSpan = {
    addEvent: vi.fn(),
    setStatus: vi.fn(),
    recordException: vi.fn(),
    spanContext: vi.fn().mockReturnValue({ traceId: 'abc123', spanId: 'def456', traceFlags: 1 }),
    end: vi.fn()
  }

  const mockTracer = {
    startSpan: vi.fn().mockReturnValue(mockSpan)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(trace, 'getTracer').mockReturnValue(mockTracer as any)
  })

  const makeEntry = (overrides = {}) => ({
    timestamp: new Date('2026-01-01T12:00:00Z'),
    level: 'info' as const,
    message: 'test log',
    ...overrides
  })

  it('adds event to active span when one exists', () => {
    vi.spyOn(trace, 'getActiveSpan').mockReturnValue(mockSpan as any)
    const transport = otelTransport()
    transport.log(makeEntry())

    expect(mockSpan.addEvent).toHaveBeenCalledWith('test log', expect.objectContaining({
      'log.level': 'info',
      'log.message': 'test log'
    }))
  })

  it('creates standalone span when no active span', () => {
    vi.spyOn(trace, 'getActiveSpan').mockReturnValue(undefined)
    const transport = otelTransport()
    transport.log(makeEntry())

    expect(mockTracer.startSpan).toHaveBeenCalledWith('test log', expect.objectContaining({
      attributes: expect.objectContaining({ 'log.level': 'info' })
    }))
    expect(mockSpan.end).toHaveBeenCalled()
  })

  it('sets error status for error-level logs', () => {
    vi.spyOn(trace, 'getActiveSpan').mockReturnValue(mockSpan as any)
    const transport = otelTransport()
    transport.log(makeEntry({ level: 'error' }))

    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: 'test log'
    })
  })

  it('records exception when entry has error', () => {
    vi.spyOn(trace, 'getActiveSpan').mockReturnValue(mockSpan as any)
    const error = new Error('boom')
    const transport = otelTransport()
    transport.log(makeEntry({ error }))

    expect(mockSpan.recordException).toHaveBeenCalledWith(error)
  })

  it('getTraceContextFromOtel returns context from active span', () => {
    vi.spyOn(trace, 'getActiveSpan').mockReturnValue(mockSpan as any)
    const context = getTraceContextFromOtel()

    expect(context).toEqual({ traceId: 'abc123', spanId: 'def456', traceFlags: 1 })
  })

  it('getTraceContextFromOtel returns undefined without active span', () => {
    vi.spyOn(trace, 'getActiveSpan').mockReturnValue(undefined)
    expect(getTraceContextFromOtel()).toBeUndefined()
  })
})
