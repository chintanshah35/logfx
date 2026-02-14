import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLogger } from 'logfx'
import { datadogTransport } from '../src/index'

describe('Datadog Transport', () => {
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

  it('sends Datadog payload shape with formatBody', async () => {
    const log = createLogger({
      transports: [
        datadogTransport({
          apiKey: 'test-key',
          service: 'test-service',
          batchSize: 1,
          flushInterval: 100
        })
      ]
    })

    log.info('hello', { userId: 42 })
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(Array.isArray(body)).toBe(true)
    expect(body[0]).toMatchObject({
      message: 'hello',
      service: 'test-service',
      status: 'info',
      userId: 42
    })
    expect(body[0]).toHaveProperty('timestamp')
    expect(body[0]).toHaveProperty('ddsource')
    expect(body[0]).toHaveProperty('hostname')
  })

  it('includes trace context when present', async () => {
    const log = createLogger({
      transports: [
        datadogTransport({
          apiKey: 'test-key',
          service: 'test-service',
          batchSize: 1,
          flushInterval: 100
        })
      ],
      trace: () => ({ traceId: 'abc', spanId: 'def' })
    })

    log.info('traced')
    await new Promise((resolve) => setTimeout(resolve, 150))

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body[0]).toHaveProperty('trace_id', 'abc')
    expect(body[0]).toHaveProperty('span_id', 'def')
  })
})
