import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLogger } from 'logfx'
import { papertrailTransport } from '../src/index'

describe('Papertrail Transport', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    global.fetch = fetchMock
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  it('sends JSON array payload', async () => {
    const log = createLogger({
      transports: [
        papertrailTransport({
          url: 'https://logs.papertrailapp.com/destinations/xxx',
          batchSize: 1,
          flushInterval: 100
        })
      ]
    })

    log.info('hello', { userId: 42 })
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('https://logs.papertrailapp.com/destinations/xxx')

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(Array.isArray(body)).toBe(true)
    expect(body[0]).toMatchObject({
      level: 'info',
      message: 'hello',
      userId: 42
    })
  })

  it('includes trace context when present', async () => {
    const log = createLogger({
      transports: [
        papertrailTransport({
          url: 'https://example.com/logs',
          batchSize: 1,
          flushInterval: 100
        })
      ],
      trace: () => ({ traceId: 'abc', spanId: 'def' })
    })

    log.info('traced')
    await new Promise((resolve) => setTimeout(resolve, 150))

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body[0]).toHaveProperty('traceId', 'abc')
    expect(body[0]).toHaveProperty('spanId', 'def')
  })
})
