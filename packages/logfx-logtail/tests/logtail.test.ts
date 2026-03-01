import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLogger } from 'logfx'
import { logtailTransport } from '../src/index'

describe('Logtail Transport', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 202 })
    global.fetch = fetchMock
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  it('sends JSON array with dt and message', async () => {
    const log = createLogger({
      transports: [
        logtailTransport({
          sourceToken: 'test-token',
          batchSize: 1,
          flushInterval: 100
        })
      ]
    })

    log.info('hello', { userId: 42 })
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [calledUrl, init] = fetchMock.mock.calls[0]
    expect(calledUrl).toBe('https://in.logs.betterstack.com')
    expect(init?.headers?.['Authorization']).toBe('Bearer test-token')
    expect(init?.headers?.['Content-Type']).toBe('application/json')

    const body = JSON.parse(init?.body as string)
    expect(Array.isArray(body)).toBe(true)
    expect(body[0]).toMatchObject({
      dt: expect.any(String),
      level: 'info',
      message: 'hello',
      userId: 42
    })
    expect(body[0].dt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })

  it('includes trace context when present', async () => {
    const log = createLogger({
      transports: [
        logtailTransport({
          sourceToken: 'test-token',
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

  it('uses custom url when configured', async () => {
    const log = createLogger({
      transports: [
        logtailTransport({
          sourceToken: 'test-token',
          url: 'https://custom.ingest.example.com',
          batchSize: 1,
          flushInterval: 100
        })
      ]
    })

    log.info('custom url event')
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(fetchMock.mock.calls[0][0]).toBe('https://custom.ingest.example.com')
  })
})
