import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLogger } from 'logfx'
import { azureTransport } from '../src/index'

describe('Azure Transport', () => {
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

  it('sends Azure record format with TimeGenerated and Level', async () => {
    const log = createLogger({
      transports: [
        azureTransport({
          workspaceId: 'workspace-id',
          sharedKey: Buffer.from('test-key-32-bytes-long!!!!').toString('base64'),
          batchSize: 1,
          flushInterval: 100
        })
      ]
    })

    log.info('hello', { userId: 42 })
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = fetchMock.mock.calls[0][0]
    expect(url).toContain('workspace-id')
    expect(url).toContain('api-version=2016-04-01')

    const headers = fetchMock.mock.calls[0][1].headers
    expect(headers['Log-Type']).toBe('LogFx')
    expect(headers['Content-Type']).toBe('application/json')
    expect(headers['Authorization']).toMatch(/^SharedKey workspace-id:/)

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).toHaveLength(1)
    expect(body[0]).toMatchObject({
      Level: 'info',
      Message: 'hello',
      userId: 42
    })
    expect(body[0]).toHaveProperty('TimeGenerated')
  })

  it('includes trace context when present', async () => {
    const log = createLogger({
      transports: [
        azureTransport({
          workspaceId: 'ws-id',
          sharedKey: Buffer.from('test-key-32-bytes-long!!!!').toString('base64'),
          batchSize: 1,
          flushInterval: 100
        })
      ],
      trace: () => ({ traceId: 'abc', spanId: 'def' })
    })

    log.info('traced')
    await new Promise((resolve) => setTimeout(resolve, 150))

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body[0]).toHaveProperty('TraceId', 'abc')
    expect(body[0]).toHaveProperty('SpanId', 'def')
  })
})
