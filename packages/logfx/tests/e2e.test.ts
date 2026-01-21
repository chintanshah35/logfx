import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest'
import { createLogger, transports } from '../src/index'
import * as fs from 'fs'
import * as path from 'path'

const TEST_LOG_DIR = './tests/tmp'
const TEST_LOG_FILE = path.join(TEST_LOG_DIR, 'test.log')

describe('E2E: File Transport', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_LOG_FILE)) {
      fs.unlinkSync(TEST_LOG_FILE)
    }
  })

  afterAll(() => {
    if (fs.existsSync(TEST_LOG_DIR)) {
      fs.rmSync(TEST_LOG_DIR, { recursive: true })
    }
  })

  it('writes logs to file', async () => {
    const log = createLogger({
      transports: [transports.file({ path: TEST_LOG_FILE, format: 'json' })]
    })

    log.info('test message', { userId: 123 })
    
    // Wait for async init and write
    await new Promise(resolve => setTimeout(resolve, 200))
    await log.flush?.()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const content = fs.readFileSync(TEST_LOG_FILE, 'utf-8')
    expect(content).toContain('"level":"info"')
    expect(content).toContain('"message":"test message"')
    expect(content).toContain('"userId":123')
  })

  it('creates directory if not exists', async () => {
    const nestedPath = path.join(TEST_LOG_DIR, 'nested/deep/app.log')
    
    const log = createLogger({
      transports: [transports.file({ path: nestedPath })]
    })

    log.info('nested test')
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(fs.existsSync(nestedPath)).toBe(true)
    
    // Cleanup
    fs.rmSync(path.join(TEST_LOG_DIR, 'nested'), { recursive: true })
  })

  it('appends to existing file', async () => {
    const log = createLogger({
      transports: [transports.file({ path: TEST_LOG_FILE })]
    })

    // Wait for init
    await new Promise(resolve => setTimeout(resolve, 200))
    
    log.info('first')
    log.info('second')
    
    await log.flush?.()
    await new Promise(resolve => setTimeout(resolve, 100))

    const content = fs.readFileSync(TEST_LOG_FILE, 'utf-8')
    const lines = content.trim().split('\n')
    expect(lines.length).toBe(2)
  })

  it('writes plain text format', async () => {
    const log = createLogger({
      namespace: 'myapp',
      transports: [transports.file({ path: TEST_LOG_FILE, format: 'pretty' })]
    })

    // Wait for init
    await new Promise(resolve => setTimeout(resolve, 200))
    
    log.warn('disk full')
    
    await log.flush?.()
    await new Promise(resolve => setTimeout(resolve, 100))

    const content = fs.readFileSync(TEST_LOG_FILE, 'utf-8')
    expect(content).toContain('WARN')
    expect(content).toContain('[myapp]')
    expect(content).toContain('disk full')
  })
})

describe('E2E: Webhook Transport', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
    fetchMock = vi.fn().mockResolvedValue({ ok: true })
    global.fetch = fetchMock
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('sends logs to webhook endpoint', async () => {
    const log = createLogger({
      transports: [transports.webhook({ 
        url: 'https://api.example.com/logs',
        batchSize: 1 
      })]
    })

    log.info('webhook test', { action: 'login' })
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/logs',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' })
      })
    )
  })

  it('batches multiple logs', async () => {
    const log = createLogger({
      transports: [transports.webhook({ 
        url: 'https://api.example.com/logs',
        batchSize: 3,
        flushInterval: 100
      })]
    })

    log.info('one')
    log.info('two')
    log.info('three')
    
    // Should trigger batch at 3
    await new Promise(resolve => setTimeout(resolve, 50))
    
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = fetchMock.mock.calls[0][1].body
    const parsed = JSON.parse(body)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed.length).toBe(3)
  })

  it('flushes on interval', async () => {
    const log = createLogger({
      transports: [transports.webhook({ 
        url: 'https://api.example.com/logs',
        batchSize: 100,
        flushInterval: 50
      })]
    })

    log.info('will flush by timer')
    
    // Wait for flush interval
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(fetchMock).toHaveBeenCalled()
  })

  it('includes custom headers', async () => {
    const log = createLogger({
      transports: [transports.webhook({ 
        url: 'https://api.example.com/logs',
        headers: { 'Authorization': 'Bearer token123' },
        batchSize: 1
      })]
    })

    log.info('with auth')
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ 
          'Authorization': 'Bearer token123' 
        })
      })
    )
  })

  it('manual flush sends buffered logs', async () => {
    const log = createLogger({
      transports: [transports.webhook({ 
        url: 'https://api.example.com/logs',
        batchSize: 100,
        flushInterval: 10000
      })]
    })

    log.info('buffered')
    expect(fetchMock).not.toHaveBeenCalled()
    
    await log.flush?.()
    
    expect(fetchMock).toHaveBeenCalled()
  })
})

