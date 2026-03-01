import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLogger } from 'logfx'
import { honeycombTransport } from '../src/index'

describe('Honeycomb Transport', () => {
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

  it('sends Honeycomb batch format with time and data', async () => {
    const log = createLogger({
      transports: [
        honeycombTransport({
          apiKey: 'test-key',
          dataset: 'test-dataset',
          batchSize: 1,
          flushInterval: 100
        })
      ]
    })

    log.info('hello', { userId: 42 })
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [calledUrl, init] = fetchMock.mock.calls[0]
    expect(calledUrl).toBe('https://api.honeycomb.io/1/batch/test-dataset')
    expect(init?.headers?.['X-Honeycomb-Team']).toBe('test-key')
    expect(init?.headers?.['Content-Type']).toBe('application/json')

    const body = JSON.parse(init?.body as string)
    expect(Array.isArray(body)).toBe(true)
    expect(body[0]).toMatchObject({
      time: expect.any(String),
      data: {
        level: 'info',
        message: 'hello',
        userId: 42
      }
    })
    expect(body[0].time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })

  it('includes trace context in data when present', async () => {
    const log = createLogger({
      transports: [
        honeycombTransport({
          apiKey: 'test-key',
          dataset: 'test-dataset',
          batchSize: 1,
          flushInterval: 100
        })
      ],
      trace: () => ({ traceId: 'abc', spanId: 'def' })
    })

    log.info('traced')
    await new Promise((resolve) => setTimeout(resolve, 150))

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body[0].data).toHaveProperty('traceId', 'abc')
    expect(body[0].data).toHaveProperty('spanId', 'def')
  })

  it('uses EU host when configured', async () => {
    const log = createLogger({
      transports: [
        honeycombTransport({
          apiKey: 'test-key',
          dataset: 'eu-logs',
          host: 'https://api.eu1.honeycomb.io',
          batchSize: 1,
          flushInterval: 100
        })
      ]
    })

    log.info('eu event')
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.eu1.honeycomb.io/1/batch/eu-logs')
  })
})
