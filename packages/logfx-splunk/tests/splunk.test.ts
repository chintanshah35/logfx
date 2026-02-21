import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLogger } from 'logfx'
import { splunkTransport } from '../src/index'

describe('Splunk Transport', () => {
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

  it('sends Splunk HEC format with event and metadata', async () => {
    const log = createLogger({
      transports: [
        splunkTransport({
          url: 'https://splunk:8088',
          token: 'test-token',
          batchSize: 1,
          flushInterval: 100
        })
      ]
    })

    log.info('hello', { userId: 42 })
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain('/services/collector/event')
    expect(fetchMock.mock.calls[0][1].headers['Authorization']).toBe('Splunk test-token')

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.event).toMatchObject({
      level: 'info',
      message: 'hello',
      userId: 42
    })
    expect(body).toHaveProperty('sourcetype', 'logfx')
    expect(body).toHaveProperty('time')
  })

  it('includes trace context when present', async () => {
    const log = createLogger({
      transports: [
        splunkTransport({
          url: 'https://splunk:8088',
          token: 'token',
          batchSize: 1,
          flushInterval: 100
        })
      ],
      trace: () => ({ traceId: 'abc', spanId: 'def' })
    })

    log.info('traced')
    await new Promise((resolve) => setTimeout(resolve, 150))

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.event).toHaveProperty('traceId', 'abc')
    expect(body.event).toHaveProperty('spanId', 'def')
  })
})
