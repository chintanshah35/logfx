import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createLogger, transports } from '../src/index'
import * as fs from 'fs'
import * as path from 'path'

const STRESS_LOG_DIR = path.join(process.cwd(), 'tests', 'stress-logs')
const STRESS_LOG_FILE = path.join(STRESS_LOG_DIR, 'stress.log')

describe('Production Stress Tests', () => {
  beforeEach(() => {
    if (fs.existsSync(STRESS_LOG_DIR)) {
      fs.rmSync(STRESS_LOG_DIR, { recursive: true })
    }
    fs.mkdirSync(STRESS_LOG_DIR, { recursive: true })
  })

  afterEach(() => {
    if (fs.existsSync(STRESS_LOG_DIR)) {
      fs.rmSync(STRESS_LOG_DIR, { recursive: true })
    }
  })

  it('handles high volume logging (10k logs)', async () => {
    const entries: any[] = []
    const log = createLogger({
      transports: [{
        name: 'memory',
        log: (entry) => entries.push(entry)
      }]
    })

    const start = Date.now()
    for (let i = 0; i < 10000; i++) {
      log.info(`Log message ${i}`, { index: i, data: 'test' })
    }
    const duration = Date.now() - start

    expect(entries.length).toBe(10000)
    expect(duration).toBeLessThan(1000) // Should handle 10k logs in under 1s
  }, 10000)

  it('handles concurrent logging from multiple loggers', async () => {
    const entries: any[] = []
    const transport = {
      name: 'memory',
      log: (entry: any) => entries.push(entry)
    }

    const loggers = Array.from({ length: 10 }, (_, i) => 
      createLogger({ 
        namespace: `worker-${i}`,
        transports: [transport]
      })
    )

    const promises = loggers.map((log, i) => 
      Promise.all(
        Array.from({ length: 100 }, (_, j) => 
          log.info(`Message ${j}`, { worker: i, index: j })
        )
      )
    )

    await Promise.all(promises)

    expect(entries.length).toBe(1000)
    const namespaces = new Set(entries.map(e => e.namespace))
    expect(namespaces.size).toBe(10)
  })

  it('handles large data objects efficiently', () => {
    const entries: any[] = []
    const log = createLogger({
      transports: [{
        name: 'memory',
        log: (entry) => entries.push(entry)
      }]
    })

    const largeObject = {
      users: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        metadata: { created: new Date(), active: true }
      }))
    }

    const start = Date.now()
    log.info('Large dataset', largeObject)
    const duration = Date.now() - start

    expect(entries.length).toBe(1)
    expect(duration).toBeLessThan(100) // Should handle large objects quickly
  })

  it('maintains performance with redaction enabled', () => {
    const entries: any[] = []
    const log = createLogger({
      redact: {
        patterns: ['email', 'ssn', 'creditCard', 'phone'],
        keys: ['password', 'token', 'apiKey']
      },
      transports: [{
        name: 'memory',
        log: (entry) => entries.push(entry)
      }]
    })

    const start = Date.now()
    for (let i = 0; i < 1000; i++) {
      log.info('User action', {
        userId: i,
        email: `user${i}@example.com`,
        password: 'secret123',
        ssn: '123-45-6789',
        action: 'login'
      })
    }
    const duration = Date.now() - start

    expect(entries.length).toBe(1000)
    expect(duration).toBeLessThan(500) // Redaction should still be fast
    expect(entries[0].data?.email).toBe('[REDACTED]')
    expect(entries[0].data?.password).toBe('[REDACTED]')
  })

  it('handles async file transport under load', async () => {
    const log = createLogger({
      transports: [transports.file({ 
        path: STRESS_LOG_FILE,
        format: 'json'
      })]
    })

    const start = Date.now()
    for (let i = 0; i < 1000; i++) {
      log.info(`Message ${i}`, { index: i })
    }
    
    await log.flush()
    await log.close()
    await new Promise(resolve => setTimeout(resolve, 100))
    const duration = Date.now() - start

    expect(fs.existsSync(STRESS_LOG_FILE)).toBe(true)
    const content = fs.readFileSync(STRESS_LOG_FILE, 'utf-8')
    const lines = content.trim().split('\n').filter(line => line.length > 0)
    
    expect(lines.length).toBeGreaterThanOrEqual(1000)
    expect(duration).toBeLessThan(3000) // Should write 1000 logs in under 3s
  }, 10000)

  it('handles memory pressure gracefully', () => {
    const entries: any[] = []
    const log = createLogger({
      transports: [{
        name: 'memory',
        log: (entry) => entries.push(entry)
      }]
    })

    const hugeString = 'x'.repeat(1000000) // 1MB string

    const start = Date.now()
    for (let i = 0; i < 10; i++) {
      log.info('Large message', { data: hugeString, index: i })
    }
    const duration = Date.now() - start

    expect(entries.length).toBe(10)
    expect(duration).toBeLessThan(500) // Should handle large strings efficiently
  })

  it('maintains accuracy under rapid-fire logging', async () => {
    const entries: any[] = []
    const log = createLogger({
      transports: [{
        name: 'memory',
        log: (entry) => entries.push(entry)
      }]
    })

    // Rapid fire logging
    for (let i = 0; i < 5000; i++) {
      log.debug(`Debug ${i}`)
      log.info(`Info ${i}`)
      log.warn(`Warn ${i}`)
      log.error(`Error ${i}`)
    }

    expect(entries.length).toBe(20000)
    
    // Verify no duplicate or missing messages
    const debugCount = entries.filter(e => e.level === 'debug').length
    const infoCount = entries.filter(e => e.level === 'info').length
    const warnCount = entries.filter(e => e.level === 'warn').length
    const errorCount = entries.filter(e => e.level === 'error').length
    
    expect(debugCount).toBe(5000)
    expect(infoCount).toBe(5000)
    expect(warnCount).toBe(5000)
    expect(errorCount).toBe(5000)
  })

  it('handles circular references without crashing', () => {
    const entries: any[] = []
    const log = createLogger({
      redact: {
        keys: ['password']
      },
      transports: [{
        name: 'memory',
        log: (entry) => entries.push(entry)
      }]
    })

    const circular: any = { name: 'test', password: 'secret' }
    circular.self = circular

    expect(() => {
      log.info('Circular object', circular)
    }).not.toThrow()

    expect(entries.length).toBe(1)
  })
})
