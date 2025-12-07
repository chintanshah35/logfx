import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { log, createLogger, logger, createExtendedLogger } from '../src/index'
import { time, timeEnd, count, countReset, group, groupEnd, assert, box, table, diff, badge } from '../src/index'

describe('logfx', () => {
  let spies: Record<string, ReturnType<typeof vi.spyOn>>

  beforeEach(() => {
    spies = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      group: vi.spyOn(console, 'group').mockImplementation(() => {}),
      groupEnd: vi.spyOn(console, 'groupEnd').mockImplementation(() => {}),
    }
  })

  afterEach(() => vi.restoreAllMocks())

  // Core
  describe('log', () => {
    it('has all methods', () => {
      expect(typeof log.debug).toBe('function')
      expect(typeof log.info).toBe('function')
      expect(typeof log.success).toBe('function')
      expect(typeof log.warn).toBe('function')
      expect(typeof log.error).toBe('function')
      expect(typeof log.child).toBe('function')
    })

    it('logs to console', () => {
      log.info('test')
      expect(spies.log).toHaveBeenCalled()
    })

    it('warns to console', () => {
      log.warn('test')
      expect(spies.warn).toHaveBeenCalled()
    })

    it('errors to console', () => {
      log.error('test')
      expect(spies.error).toHaveBeenCalled()
    })
  })

  describe('createLogger', () => {
    it('creates namespaced logger', () => {
      const auth = createLogger({ namespace: 'auth' })
      auth.info('test')
      expect(spies.log).toHaveBeenCalled()
    })

    it('respects enabled option', () => {
      const disabled = createLogger({ enabled: false })
      disabled.info('test')
      expect(spies.log).not.toHaveBeenCalled()
    })

    it('filters by level', () => {
      const errorOnly = createLogger({ level: 'error' })
      errorOnly.info('nope')
      expect(spies.log).not.toHaveBeenCalled()
      errorOnly.error('yes')
      expect(spies.error).toHaveBeenCalled()
    })
  })

  describe('child', () => {
    it('creates nested namespace', () => {
      const parent = createLogger({ namespace: 'app' })
      const child = parent.child('auth')
      child.info('test')
      expect(spies.log).toHaveBeenCalled()
    })
  })

  describe('logger()', () => {
    it('creates namespaced logger', () => {
      const db = logger('db')
      db.info('test')
      expect(spies.log).toHaveBeenCalled()
    })
  })

  describe('setEnabled', () => {
    it('toggles logging', () => {
      const l = createLogger()
      l.info('1')
      expect(spies.log).toHaveBeenCalledTimes(1)
      l.setEnabled(false)
      l.info('2')
      expect(spies.log).toHaveBeenCalledTimes(1)
      l.setEnabled(true)
      l.info('3')
      expect(spies.log).toHaveBeenCalledTimes(2)
    })
  })

  // Extended
  describe('time/timeEnd', () => {
    it('logs duration', () => {
      time('test')
      timeEnd('test')
      expect(spies.log).toHaveBeenCalled()
    })

    it('warns on missing timer', () => {
      timeEnd('nope')
      expect(spies.warn).toHaveBeenCalled()
    })
  })

  describe('count', () => {
    it('increments', () => {
      count('x')
      count('x')
      expect(spies.log).toHaveBeenCalledTimes(2)
    })
  })

  describe('group', () => {
    it('groups', () => {
      group('test')
      groupEnd()
      expect(spies.group).toHaveBeenCalled()
      expect(spies.groupEnd).toHaveBeenCalled()
    })
  })

  describe('assert', () => {
    it('logs on false', () => {
      assert(false, 'fail')
      expect(spies.log).toHaveBeenCalled()
    })

    it('silent on true', () => {
      assert(true, 'ok')
      expect(spies.log).not.toHaveBeenCalled()
    })
  })

  describe('box', () => {
    it('logs box', () => {
      box('test')
      expect(spies.log).toHaveBeenCalled()
    })

    it('accepts options', () => {
      box('test', { title: 'Hi', borderColor: 'green' })
      expect(spies.log).toHaveBeenCalled()
    })
  })

  describe('table', () => {
    it('logs table', () => {
      table([{ a: 1 }])
      expect(spies.log).toHaveBeenCalled()
    })

    it('handles empty', () => {
      table([])
      expect(spies.log).toHaveBeenCalled()
    })
  })

  describe('diff', () => {
    it('shows changes', () => {
      diff({ a: 1 }, { a: 2 })
      expect(spies.log).toHaveBeenCalled()
    })

    it('shows no changes', () => {
      diff({ a: 1 }, { a: 1 })
      expect(spies.log).toHaveBeenCalled()
    })
  })

  describe('badge', () => {
    it('logs badge', () => {
      badge('TEST', 'green')
      expect(spies.log).toHaveBeenCalled()
    })
  })

  describe('createExtendedLogger', () => {
    it('has all methods', () => {
      const ext = createExtendedLogger()
      expect(typeof ext.info).toBe('function')
      expect(typeof ext.box).toBe('function')
      expect(typeof ext.table).toBe('function')
      expect(typeof ext.diff).toBe('function')
      expect(typeof ext.time).toBe('function')
    })
  })
})

