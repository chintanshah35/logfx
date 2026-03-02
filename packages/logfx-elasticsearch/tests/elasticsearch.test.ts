import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLogger } from 'logfx'
import { elasticsearchTransport } from '../src/index'

describe('Elasticsearch Transport', () => {
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

  it('sends NDJSON bulk format', async () => {
    const log = createLogger({
      transports: [
        elasticsearchTransport({
          node: 'https://es.example.com:9200',
          index: 'app-logs',
          batchSize: 1,
          flushInterval: 100
        })
      ]
    })

    log.info('hello', { userId: 42 })
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [calledUrl, init] = fetchMock.mock.calls[0]
    expect(calledUrl).toBe('https://es.example.com:9200/_bulk')
    expect(init?.headers?.['Content-Type']).toBe('application/x-ndjson')

    const lines = (init?.body as string).trim().split('\n')
    expect(lines.length).toBe(2)
    const action = JSON.parse(lines[0])
    expect(action).toEqual({ index: { _index: 'app-logs' } })
    const doc = JSON.parse(lines[1])
    expect(doc).toMatchObject({
      level: 'info',
      message: 'hello',
      userId: 42
    })
    expect(doc).toHaveProperty('@timestamp')
  })

  it('includes trace context', async () => {
    const log = createLogger({
      transports: [
        elasticsearchTransport({
          node: 'https://es.example.com:9200',
          batchSize: 1,
          flushInterval: 100
        })
      ],
      trace: () => ({ traceId: 'abc', spanId: 'def' })
    })

    log.info('traced')
    await new Promise((resolve) => setTimeout(resolve, 150))

    const lines = (fetchMock.mock.calls[0][1].body as string).trim().split('\n')
    const doc = JSON.parse(lines[1])
    expect(doc.trace).toEqual({ traceId: 'abc', spanId: 'def' })
  })

  it('supports API key auth', async () => {
    const log = createLogger({
      transports: [
        elasticsearchTransport({
          node: 'https://es.example.com:9200',
          auth: { apiKey: 'my-key' },
          batchSize: 1,
          flushInterval: 100
        })
      ]
    })

    log.info('auth test')
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(fetchMock.mock.calls[0][1].headers['Authorization']).toBe('ApiKey my-key')
  })
})
