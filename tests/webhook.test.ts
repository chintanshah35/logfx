import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLogger, transports } from '../src/index'
import type { LogEntry } from '../src/types'

describe('Webhook Transport', () => {
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

  describe('basic functionality', () => {
    it('sends single log entry as JSON array', async () => {
      const log = createLogger({
        transports: [transports.webhook({ 
          url: 'https://api.example.com/logs',
          batchSize: 1 
        })]
      })

      log.info('test message', { userId: 123 })
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const call = fetchMock.mock.calls[0]
      expect(call[0]).toBe('https://api.example.com/logs')
      expect(call[1].method).toBe('POST')
      expect(call[1].headers['Content-Type']).toBe('application/json')

      const body = JSON.parse(call[1].body)
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBe(1)
      expect(body[0]).toHaveProperty('level', 'info')
      expect(body[0]).toHaveProperty('message', 'test message')
      expect(body[0]).toHaveProperty('timestamp')
      expect(body[0].data).toEqual({ userId: 123 })
    })

    it('sends array for batched entries', async () => {
      const log = createLogger({
        transports: [transports.webhook({ 
          url: 'https://api.example.com/logs',
          batchSize: 3 
        })]
      })

      log.info('first')
      log.info('second')
      log.info('third')
      
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBe(3)
      expect(body[0]).toHaveProperty('level', 'info')
      expect(body[1]).toHaveProperty('level', 'info')
      expect(body[2]).toHaveProperty('level', 'info')
    })

    it('includes all log entry fields', async () => {
      const log = createLogger({
        namespace: 'myapp',
        transports: [transports.webhook({ 
          url: 'https://api.example.com/logs',
          batchSize: 1 
        })]
      })

      const error = new Error('test error')
      log.error('failed', error, { context: 'testing' })
      
      await new Promise(resolve => setTimeout(resolve, 50))

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBe(1)
      expect(body[0]).toHaveProperty('level', 'error')
      expect(body[0]).toHaveProperty('message', 'failed')
      expect(body[0]).toHaveProperty('namespace', 'myapp')
      expect(body[0]).toHaveProperty('timestamp')
      expect(body[0]).toHaveProperty('error')
      expect(body[0].error).toHaveProperty('name', 'Error')
      expect(body[0].error).toHaveProperty('message', 'test error')
      expect(body[0].error).toHaveProperty('stack')
      expect(body[0].data).toEqual({ context: 'testing' })
    })
  })

  describe('batching', () => {
    it('batches when batchSize is reached', async () => {
      const log = createLogger({
        transports: [transports.webhook({ 
          url: 'https://api.example.com/logs',
          batchSize: 2 
        })]
      })

      log.info('one')
      log.info('two')
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.length).toBe(2)
    })

    it('does not batch until batchSize reached', async () => {
      const log = createLogger({
        transports: [transports.webhook({ 
          url: 'https://api.example.com/logs',
          batchSize: 5,
          flushInterval: 10000 
        })]
      })

      log.info('one')
      log.info('two')
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('flushes on interval', async () => {
      const log = createLogger({
        transports: [transports.webhook({ 
          url: 'https://api.example.com/logs',
          batchSize: 100,
          flushInterval: 100 
        })]
      })

      log.info('will flush by timer')
      expect(fetchMock).not.toHaveBeenCalled()

      await new Promise(resolve => setTimeout(resolve, 150))

      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('flush', () => {
    it('flushes buffered logs on manual flush', async () => {
      const log = createLogger({
        transports: [transports.webhook({ 
          url: 'https://api.example.com/logs',
          batchSize: 100,
          flushInterval: 10000 
        })]
      })

      log.info('buffered')
      log.info('also buffered')
      expect(fetchMock).not.toHaveBeenCalled()

      await log.flush()

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.length).toBe(2)
    })

    it('flush clears buffer after sending', async () => {
      const log = createLogger({
        transports: [transports.webhook({ 
          url: 'https://api.example.com/logs',
          batchSize: 100,
          flushInterval: 10000 
        })]
      })

      log.info('first')
      await log.flush()
      expect(fetchMock).toHaveBeenCalledTimes(1)

      log.info('second')
      await log.flush()
      expect(fetchMock).toHaveBeenCalledTimes(2)

      const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body)
      expect(secondBody.length).toBe(1)
      expect(secondBody[0].message).toBe('second')
    })
  })

  describe('configuration', () => {
    it('uses custom headers', async () => {
      const log = createLogger({
        transports: [transports.webhook({ 
          url: 'https://api.example.com/logs',
          headers: { 
            'Authorization': 'Bearer token123',
            'X-Custom': 'value'
          },
          batchSize: 1 
        })]
      })

      log.info('test')
      await new Promise(resolve => setTimeout(resolve, 50))

      const headers = fetchMock.mock.calls[0][1].headers
      expect(headers['Authorization']).toBe('Bearer token123')
      expect(headers['X-Custom']).toBe('value')
      expect(headers['Content-Type']).toBe('application/json')
    })

    it('uses custom HTTP method', async () => {
      const log = createLogger({
        transports: [transports.webhook({ 
          url: 'https://api.example.com/logs',
          method: 'PUT',
          batchSize: 1 
        })]
      })

      log.info('test')
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(fetchMock.mock.calls[0][1].method).toBe('PUT')
    })

    it('uses default batchSize and flushInterval', async () => {
      const log = createLogger({
        transports: [transports.webhook({ 
          url: 'https://api.example.com/logs'
        })]
      })

      // Default batchSize is 10, so send 10 logs
      for (let i = 0; i < 10; i++) {
        log.info(`message ${i}`)
      }
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.length).toBe(10)
    })
  })

  describe('error handling', () => {
    it('does not crash on network errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      fetchMock.mockRejectedValue(new Error('Network error'))

      const log = createLogger({
        transports: [transports.webhook({ 
          url: 'https://api.example.com/logs',
          batchSize: 1 
        })]
      })

      log.info('test')
      await new Promise(resolve => setTimeout(resolve, 50))

      // Should not throw, should continue logging
      log.info('another')
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(fetchMock).toHaveBeenCalledTimes(2)
      consoleErrorSpy.mockRestore()
    })

    it('always logs errors (not just in DEBUG mode)', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      fetchMock.mockRejectedValue(new Error('Webhook failed'))

      const log = createLogger({
        transports: [transports.webhook({ 
          url: 'https://api.example.com/logs',
          batchSize: 1 
        })]
      })

      log.info('test')
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('Failed to send logs')

      consoleErrorSpy.mockRestore()
    })

    it('handles non-200 responses gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      fetchMock.mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' })

      const log = createLogger({
        transports: [transports.webhook({ 
          url: 'https://api.example.com/logs',
          batchSize: 1 
        })]
      })

      log.info('test')
      await new Promise(resolve => setTimeout(resolve, 50))

      // Should not throw and should log the error
      expect(fetchMock).toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('HTTP 500')

      consoleErrorSpy.mockRestore()
    })
  })

  describe('close', () => {
    it('flushes remaining logs on close', async () => {
      const log = createLogger({
        transports: [transports.webhook({ 
          url: 'https://api.example.com/logs',
          batchSize: 100,
          flushInterval: 10000 
        })]
      })

      log.info('one')
      log.info('two')
      expect(fetchMock).not.toHaveBeenCalled()

      await log.close()

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.length).toBe(2)
    })
  })
})
