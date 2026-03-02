import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sentryTransport } from '../src/index'
import * as Sentry from '@sentry/node'

vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn()
}))

describe('Sentry Transport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const makeEntry = (overrides = {}) => ({
    timestamp: new Date('2026-01-01T12:00:00Z'),
    level: 'error' as const,
    message: 'something broke',
    namespace: 'api',
    requestId: 'req-1',
    ...overrides
  })

  it('captures exceptions for entries with errors', () => {
    const transport = sentryTransport({ minLevel: 'warn' })
    const error = new Error('test error')
    transport.log(makeEntry({ error }))

    expect(Sentry.captureException).toHaveBeenCalledTimes(1)
    expect(Sentry.captureException).toHaveBeenCalledWith(error, expect.objectContaining({
      level: 'error',
      tags: expect.objectContaining({ namespace: 'api', requestId: 'req-1' })
    }))
  })

  it('captures messages for entries without errors', () => {
    const transport = sentryTransport({ minLevel: 'warn' })
    transport.log(makeEntry({ level: 'warn', error: undefined }))

    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1)
    expect(Sentry.captureMessage).toHaveBeenCalledWith('something broke', expect.objectContaining({
      level: 'warning'
    }))
  })

  it('filters below minLevel', () => {
    const transport = sentryTransport({ minLevel: 'error' })
    transport.log(makeEntry({ level: 'warn', error: undefined }))

    expect(Sentry.captureException).not.toHaveBeenCalled()
    expect(Sentry.captureMessage).not.toHaveBeenCalled()
  })

  it('includes context data when captureContext is true', () => {
    const transport = sentryTransport({ captureContext: true })
    const error = new Error('ctx error')
    transport.log(makeEntry({ data: { userId: 42 }, error }))

    expect(Sentry.captureException).toHaveBeenCalledWith(error, expect.objectContaining({
      contexts: { logData: { userId: 42 } }
    }))
  })
})
