import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLogger, transports } from '../src'
import type { LogEntry, Transport } from '../src/types'

describe('Field Redaction', () => {
  it('redacts sensitive keys', () => {
    const entries: LogEntry[] = []
    const mockTransport: Transport = {
      name: 'mock',
      log: (entry) => { entries.push(entry) }
    }

    const log = createLogger({
      transports: [mockTransport],
      redact: { keys: ['password', 'token'] }
    })

    log.info('User login', { username: 'john', password: 'secret123', token: 'abc' })

    expect(entries[0].data?.username).toBe('john')
    expect(entries[0].data?.password).toBe('[REDACTED]')
    expect(entries[0].data?.token).toBe('[REDACTED]')
  })

  it('redacts nested keys', () => {
    const entries: LogEntry[] = []
    const mockTransport: Transport = {
      name: 'mock',
      log: (entry) => { entries.push(entry) }
    }

    const log = createLogger({
      transports: [mockTransport],
      redact: { keys: ['apiKey'] }
    })

    log.info('Config', { service: { name: 'api', apiKey: 'secret' } })

    const service = entries[0].data?.service as Record<string, unknown>
    expect(service.name).toBe('api')
    expect(service.apiKey).toBe('[REDACTED]')
  })

  it('redacts by path', () => {
    const entries: LogEntry[] = []
    const mockTransport: Transport = {
      name: 'mock',
      log: (entry) => { entries.push(entry) }
    }

    const log = createLogger({
      transports: [mockTransport],
      redact: { paths: ['user.email', 'config.secret'] }
    })

    log.info('Data', { 
      user: { name: 'John', email: 'john@example.com' },
      config: { secret: 'xyz', public: 'abc' }
    })

    const user = entries[0].data?.user as Record<string, unknown>
    const config = entries[0].data?.config as Record<string, unknown>
    expect(user.name).toBe('John')
    expect(user.email).toBe('[REDACTED]')
    expect(config.secret).toBe('[REDACTED]')
    expect(config.public).toBe('abc')
  })

  it('uses custom censor string', () => {
    const entries: LogEntry[] = []
    const mockTransport: Transport = {
      name: 'mock',
      log: (entry) => { entries.push(entry) }
    }

    const log = createLogger({
      transports: [mockTransport],
      redact: { keys: ['password'], censor: '***' }
    })

    log.info('Login', { password: 'secret' })

    expect(entries[0].data?.password).toBe('***')
  })
})

describe('Context', () => {
  it('adds context to all logs', () => {
    const entries: LogEntry[] = []
    const mockTransport: Transport = {
      name: 'mock',
      log: (entry) => { entries.push(entry) }
    }

    const log = createLogger({
      transports: [mockTransport],
      context: { service: 'api', version: '1.0.0' }
    })

    log.info('Request received', { path: '/users' })

    expect(entries[0].data?.service).toBe('api')
    expect(entries[0].data?.version).toBe('1.0.0')
    expect(entries[0].data?.path).toBe('/users')
  })

  it('child logger inherits and extends context', () => {
    const entries: LogEntry[] = []
    const mockTransport: Transport = {
      name: 'mock',
      log: (entry) => { entries.push(entry) }
    }

    const log = createLogger({
      transports: [mockTransport],
      context: { service: 'api' }
    })

    const childLog = log.child('request', { context: { requestId: 'req-123' } })
    childLog.info('Processing')

    expect(entries[0].data?.service).toBe('api')
    expect(entries[0].data?.requestId).toBe('req-123')
    expect(entries[0].namespace).toBe('request')
  })

  it('child context overrides parent context', () => {
    const entries: LogEntry[] = []
    const mockTransport: Transport = {
      name: 'mock',
      log: (entry) => { entries.push(entry) }
    }

    const log = createLogger({
      transports: [mockTransport],
      context: { env: 'dev' }
    })

    const childLog = log.child('prod', { context: { env: 'production' } })
    childLog.info('Running')

    expect(entries[0].data?.env).toBe('production')
  })
})

describe('Sampling', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('samples logs based on rate', () => {
    const entries: LogEntry[] = []
    const mockTransport: Transport = {
      name: 'mock',
      log: (entry) => { entries.push(entry) }
    }

    const log = createLogger({
      transports: [mockTransport],
      sampling: { debug: 0.5 }
    })

    // First call returns 0.3 (less than 0.5, should log)
    vi.mocked(Math.random).mockReturnValueOnce(0.3)
    log.debug('Should log')

    // Second call returns 0.7 (greater than 0.5, should not log)
    vi.mocked(Math.random).mockReturnValueOnce(0.7)
    log.debug('Should not log')

    expect(entries.length).toBe(1)
    expect(entries[0].message).toBe('Should log')
  })

  it('always logs when rate is 1', () => {
    const entries: LogEntry[] = []
    const mockTransport: Transport = {
      name: 'mock',
      log: (entry) => { entries.push(entry) }
    }

    const log = createLogger({
      transports: [mockTransport],
      sampling: { error: 1.0, debug: 0 }
    })

    log.error('Error 1')
    log.error('Error 2')
    log.debug('Debug') // Should never log

    expect(entries.length).toBe(2)
  })

  it('never logs when rate is 0', () => {
    const entries: LogEntry[] = []
    const mockTransport: Transport = {
      name: 'mock',
      log: (entry) => { entries.push(entry) }
    }

    const log = createLogger({
      transports: [mockTransport],
      sampling: { info: 0 }
    })

    log.info('Should not log')
    log.info('Also should not log')

    expect(entries.length).toBe(0)
  })
})

describe('Async Logging', () => {
  it('buffers logs in async mode', async () => {
    const entries: LogEntry[] = []
    const mockTransport: Transport = {
      name: 'mock',
      log: (entry) => { entries.push(entry) }
    }

    const log = createLogger({
      transports: [mockTransport],
      async: true,
      buffer: { size: 3, flushInterval: 0 }
    })

    log.info('Log 1')
    log.info('Log 2')
    
    // Not flushed yet (buffer size is 3)
    expect(entries.length).toBe(0)

    log.info('Log 3')
    
    // Should auto-flush at buffer size
    // Give it a moment to flush
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(entries.length).toBe(3)

    await log.close()
  })

  it('flushes on manual flush call', async () => {
    const entries: LogEntry[] = []
    const mockTransport: Transport = {
      name: 'mock',
      log: (entry) => { entries.push(entry) }
    }

    const log = createLogger({
      transports: [mockTransport],
      async: true,
      buffer: { size: 100, flushInterval: 0 }
    })

    log.info('Log 1')
    log.info('Log 2')

    expect(entries.length).toBe(0)

    await log.flush()

    expect(entries.length).toBe(2)

    await log.close()
  })

  it('flushes remaining logs on close', async () => {
    const entries: LogEntry[] = []
    const mockTransport: Transport = {
      name: 'mock',
      log: (entry) => { entries.push(entry) }
    }

    const log = createLogger({
      transports: [mockTransport],
      async: true,
      buffer: { size: 100, flushInterval: 0 }
    })

    log.info('Log 1')
    log.info('Log 2')

    await log.close()

    expect(entries.length).toBe(2)
  })
})

describe('Error Serialization', () => {
  it('serializes error objects in JSON format', () => {
    const entries: LogEntry[] = []
    const mockTransport: Transport = {
      name: 'mock',
      log: (entry) => { entries.push(entry) }
    }

    const log = createLogger({
      transports: [mockTransport]
    })

    const error = new Error('Something went wrong')
    log.error('Operation failed', error)

    expect(entries[0].error).toBeDefined()
    expect(entries[0].error?.message).toBe('Something went wrong')
    expect(entries[0].error?.name).toBe('Error')
  })
})
