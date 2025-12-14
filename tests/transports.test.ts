import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLogger, transports, consoleTransport } from '../src/index'

describe('transports', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => vi.restoreAllMocks())

  describe('consoleTransport', () => {
    it('logs in pretty mode', () => {
      const log = createLogger({
        transports: [consoleTransport({ format: 'pretty' })]
      })
      log.info('test message')
      expect(consoleSpy).toHaveBeenCalled()
    })

    it('logs in json mode', () => {
      const log = createLogger({
        transports: [consoleTransport({ format: 'json' })]
      })
      log.info('test message')
      expect(consoleSpy).toHaveBeenCalled()
      const output = consoleSpy.mock.calls[0][0]
      expect(output).toContain('"level":"info"')
      expect(output).toContain('"message":"test message"')
    })

    it('includes namespace in output', () => {
      const log = createLogger({
        namespace: 'myapp',
        transports: [consoleTransport({ format: 'json' })]
      })
      log.info('hello')
      const output = consoleSpy.mock.calls[0][0]
      expect(output).toContain('"namespace":"myapp"')
    })

    it('includes data in output', () => {
      const log = createLogger({
        transports: [consoleTransport({ format: 'json' })]
      })
      log.info('user login', { userId: 123 })
      const output = consoleSpy.mock.calls[0][0]
      expect(output).toContain('"userId":123')
    })
  })

  describe('transports object', () => {
    it('exports console transport', () => {
      expect(typeof transports.console).toBe('function')
    })

    it('exports file transport', () => {
      expect(typeof transports.file).toBe('function')
    })

    it('exports webhook transport', () => {
      expect(typeof transports.webhook).toBe('function')
    })
  })

  describe('multiple transports', () => {
    it('logs to all transports', () => {
      const customLog = vi.fn()
      const customTransport = {
        name: 'custom',
        log: customLog
      }

      const log = createLogger({
        transports: [
          consoleTransport({ format: 'json' }),
          customTransport
        ]
      })

      log.info('test')
      expect(consoleSpy).toHaveBeenCalled()
      expect(customLog).toHaveBeenCalled()
    })
  })

  describe('flush', () => {
    it('flushes all transports', async () => {
      const flushFn = vi.fn()
      const customTransport = {
        name: 'custom',
        log: vi.fn(),
        flush: flushFn
      }

      const log = createLogger({
        transports: [customTransport]
      })

      await log.flush?.()
      expect(flushFn).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('serializes errors in json output', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const log = createLogger({
        transports: [consoleTransport({ format: 'json' })]
      })
      log.error('something failed', new Error('connection timeout'))
      const output = errorSpy.mock.calls[0][0]
      expect(output).toContain('"level":"error"')
      expect(output).toContain('"error"')
      expect(output).toContain('connection timeout')
      errorSpy.mockRestore()
    })
  })

  describe('log levels', () => {
    it('uses warn for warnings', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const log = createLogger({
        transports: [consoleTransport({ format: 'json' })]
      })
      log.warn('disk space low')
      expect(warnSpy).toHaveBeenCalled()
      const output = warnSpy.mock.calls[0][0]
      expect(output).toContain('"level":"warn"')
      warnSpy.mockRestore()
    })

    it('uses debug for debug logs', () => {
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
      const log = createLogger({
        transports: [consoleTransport({ format: 'json' })]
      })
      log.debug('verbose info')
      expect(debugSpy).toHaveBeenCalled()
      debugSpy.mockRestore()
    })
  })

  describe('child loggers', () => {
    it('child inherits parent transports', () => {
      const log = createLogger({
        namespace: 'app',
        transports: [consoleTransport({ format: 'json' })]
      })
      const child = log.child('db')
      child.info('connected')
      const output = consoleSpy.mock.calls[0][0]
      expect(output).toContain('"namespace":"app:db"')
    })
  })
})

