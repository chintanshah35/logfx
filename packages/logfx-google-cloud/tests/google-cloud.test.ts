import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLogger } from 'logfx'
import { googleCloudTransport } from '../src/index'

describe('Google Cloud Transport', () => {
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

  it('sends GCP payload shape with logName and entries', async () => {
    const log = createLogger({
      transports: [
        googleCloudTransport({
          projectId: 'my-project',
          accessToken: 'test-token',
          batchSize: 1,
          flushInterval: 100
        })
      ]
    })

    log.info('hello', { userId: 42 })
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('https://logging.googleapis.com/v2/entries:write')
    expect(fetchMock.mock.calls[0][1].headers['Authorization']).toBe('Bearer test-token')

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.logName).toBe('projects/my-project/logs/logfx')
    expect(body.entries).toHaveLength(1)
    expect(body.entries[0].jsonPayload).toMatchObject({
      level: 'info',
      message: 'hello',
      userId: 42
    })
    expect(body.entries[0]).toHaveProperty('severity', 'INFO')
  })

  it('includes trace context when present', async () => {
    const log = createLogger({
      transports: [
        googleCloudTransport({
          projectId: 'my-project',
          accessToken: 'token',
          batchSize: 1,
          flushInterval: 100
        })
      ],
      trace: () => ({ traceId: 'abc', spanId: 'def' })
    })

    log.info('traced')
    await new Promise((resolve) => setTimeout(resolve, 150))

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.entries[0].jsonPayload.trace).toEqual({ traceId: 'abc', spanId: 'def' })
  })
})
