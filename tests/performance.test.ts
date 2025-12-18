import { describe, it, expect, vi } from 'vitest'
import { createLogger, transports, log } from '../src/index'

describe('Performance', () => {
  it('logs 10,000 messages in under 500ms (no transport)', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    
    const logger = createLogger()
    const iterations = 10000
    
    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      logger.info('test message', { index: i })
    }
    const duration = performance.now() - start
    
    consoleSpy.mockRestore()
    
    console.log(`  → ${iterations} logs in ${duration.toFixed(2)}ms (${(iterations / duration * 1000).toFixed(0)} logs/sec)`)
    expect(duration).toBeLessThan(500)
  })

  it('logs 10,000 messages with JSON transport in under 500ms', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    
    const logger = createLogger({
      transports: [transports.console({ format: 'json' })]
    })
    const iterations = 10000
    
    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      logger.info('test message', { index: i })
    }
    const duration = performance.now() - start
    
    consoleSpy.mockRestore()
    
    console.log(`  → ${iterations} JSON logs in ${duration.toFixed(2)}ms (${(iterations / duration * 1000).toFixed(0)} logs/sec)`)
    expect(duration).toBeLessThan(500)
  })

  it('logs 10,000 messages with pretty transport in under 1000ms', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    
    const logger = createLogger({
      transports: [transports.console({ format: 'pretty' })]
    })
    const iterations = 10000
    
    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      logger.info('test message', { index: i })
    }
    const duration = performance.now() - start
    
    consoleSpy.mockRestore()
    
    console.log(`  → ${iterations} pretty logs in ${duration.toFixed(2)}ms (${(iterations / duration * 1000).toFixed(0)} logs/sec)`)
    expect(duration).toBeLessThan(1000)
  })

  it('handles large metadata objects', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    
    const logger = createLogger({
      transports: [transports.console({ format: 'json' })]
    })
    
    const largeData = {
      users: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        metadata: { created: new Date().toISOString(), active: true }
      }))
    }
    
    const iterations = 1000
    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      logger.info('large payload', largeData)
    }
    const duration = performance.now() - start
    
    consoleSpy.mockRestore()
    
    console.log(`  → ${iterations} large object logs in ${duration.toFixed(2)}ms`)
    expect(duration).toBeLessThan(2000)
  })

  it('child logger creation is fast', () => {
    const logger = createLogger({ namespace: 'app' })
    const iterations = 10000
    
    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      logger.child(`module-${i}`)
    }
    const duration = performance.now() - start
    
    console.log(`  → ${iterations} child loggers in ${duration.toFixed(2)}ms`)
    expect(duration).toBeLessThan(100)
  })

  it('level filtering skips disabled levels quickly', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    
    const logger = createLogger({
      level: 'warn',
      transports: [transports.console({ format: 'json' })]
    })
    
    const iterations = 100000
    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      logger.debug('should be skipped')
    }
    const duration = performance.now() - start
    
    consoleSpy.mockRestore()
    debugSpy.mockRestore()
    
    console.log(`  → ${iterations} skipped logs in ${duration.toFixed(2)}ms`)
    expect(duration).toBeLessThan(100)
    expect(consoleSpy).not.toHaveBeenCalled()
  })
})

