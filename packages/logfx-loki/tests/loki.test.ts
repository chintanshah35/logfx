import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLogger } from 'logfx'
import { lokiTransport } from '../src/index'

describe('Loki Transport', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
    global.fetch = fetchMock
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  it('sends Loki push format with streams and values', async () => {
    const log = createLogger({
      transports: [
        lokiTransport({
          url: 'http://localhost:3100',
          labels: { app: 'test' },
          batchSize: 1,
          flushInterval: 100
        })
      ]
    })

    log.info('hello', { userId: 42 })
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain('/loki/api/v1/push')

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.streams).toHaveLength(1)
    expect(body.streams[0].stream).toEqual({ app: 'test' })
    expect(body.streams[0].values).toHaveLength(1)

    const logPayload = JSON.parse(body.streams[0].values[0][1])
    expect(logPayload).toMatchObject({
      level: 'info',
      message: 'hello',
      userId: 42
    })
  })

  it('includes trace context when present', async () => {
    const log = createLogger({
      transports: [
        lokiTransport({
          url: 'http://loki:3100',
          batchSize: 1,
          flushInterval: 100
        })
      ],
      trace: () => ({ traceId: 'abc', spanId: 'def' })
    })

    log.info('traced')
    await new Promise((resolve) => setTimeout(resolve, 150))

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    const logPayload = JSON.parse(body.streams[0].values[0][1])
    expect(logPayload.trace).toEqual({ traceId: 'abc', spanId: 'def' })
  })
})
