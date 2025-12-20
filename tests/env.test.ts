import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isProduction, getDebugFilter } from '../src/env'

describe('env', () => {
  const originalProcess = global.process
  const originalWindow = global.window
  const originalLocalStorage = global.localStorage

  beforeEach(() => {
    // Reset globals
    delete (global as any).process
    delete (global as any).window
    delete (global as any).localStorage
  })

  afterEach(() => {
    global.process = originalProcess
    global.window = originalWindow
    global.localStorage = originalLocalStorage
    vi.restoreAllMocks()
  })

  describe('isProduction', () => {
    it('returns true when NODE_ENV is production', () => {
      global.process = {
        env: { NODE_ENV: 'production' }
      } as any
      expect(isProduction()).toBe(true)
    })

    it('returns false when NODE_ENV is development', () => {
      global.process = {
        env: { NODE_ENV: 'development' }
      } as any
      expect(isProduction()).toBe(false)
    })

    it('returns false when NODE_ENV is staging', () => {
      global.process = {
        env: { NODE_ENV: 'staging' }
      } as any
      expect(isProduction()).toBe(false)
    })

    it('returns false when NODE_ENV is test', () => {
      global.process = {
        env: { NODE_ENV: 'test' }
      } as any
      expect(isProduction()).toBe(false)
    })

    it('returns false when NODE_ENV is dev', () => {
      global.process = {
        env: { NODE_ENV: 'dev' }
      } as any
      expect(isProduction()).toBe(false)
    })

    it('returns false when NODE_ENV is undefined', () => {
      global.process = {
        env: {}
      } as any
      expect(isProduction()).toBe(false)
    })

    it('returns false when process.env is undefined', () => {
      global.process = {} as any
      expect(isProduction()).toBe(false)
    })

    it('returns false when process is undefined (browser)', () => {
      global.window = {} as any
      expect(isProduction()).toBe(false)
    })

    it('handles build-time replacement (string literal)', () => {
      // Simulate bundler replacing process.env.NODE_ENV with 'production'
      global.process = {
        env: { NODE_ENV: 'production' }
      } as any
      expect(isProduction()).toBe(true)
    })

    it('handles incorrectly polyfilled process.env in browser', () => {
      global.window = {} as any
      global.process = {
        env: {} // Empty object polyfill
      } as any
      expect(isProduction()).toBe(false)
    })

    it('handles process.env as non-object (edge case)', () => {
      global.process = {
        env: 'not-an-object' as any
      } as any
      expect(isProduction()).toBe(false)
    })

    it('handles process.env as null', () => {
      global.process = {
        env: null
      } as any
      expect(isProduction()).toBe(false)
    })

    it('handles process.env.NODE_ENV as non-string', () => {
      global.process = {
        env: { NODE_ENV: 123 as any }
      } as any
      expect(isProduction()).toBe(false)
    })

    it('handles process.env.NODE_ENV as empty string', () => {
      global.process = {
        env: { NODE_ENV: '' }
      } as any
      // Empty string is not 'production', so should return false
      expect(isProduction()).toBe(false)
    })

    it('handles serverless/edge runtime where process.env access throws', () => {
      global.process = {
        get env() {
          throw new Error('Cannot access env')
        }
      } as any
      expect(isProduction()).toBe(false)
    })

    it('handles NODE_ENV key missing vs undefined value', () => {
      global.process = {
        env: { NODE_ENV: undefined }
      } as any
      expect(isProduction()).toBe(false)
    })

    it('handles edge runtime with neither window nor process', () => {
      delete (global as any).process
      delete (global as any).window
      expect(isProduction()).toBe(false)
    })
  })

  describe('getDebugFilter', () => {
    it('returns DEBUG from process.env', () => {
      global.process = {
        env: { DEBUG: 'app:*' }
      } as any
      expect(getDebugFilter()).toBe('app:*')
    })

    it('returns null when DEBUG is not set', () => {
      global.process = {
        env: {}
      } as any
      expect(getDebugFilter()).toBe(null)
    })

    it('returns DEBUG from localStorage in browser', () => {
      global.window = {} as any
      global.localStorage = {
        getItem: vi.fn((key: string) => key === 'DEBUG' ? 'browser:*' : null)
      } as any
      expect(getDebugFilter()).toBe('browser:*')
    })

    it('prefers process.env.DEBUG over localStorage', () => {
      global.window = {} as any
      global.process = {
        env: { DEBUG: 'env:*' }
      } as any
      global.localStorage = {
        getItem: vi.fn((key: string) => key === 'DEBUG' ? 'local:*' : null)
      } as any
      expect(getDebugFilter()).toBe('env:*')
    })

    it('handles localStorage access failure (private browsing)', () => {
      global.window = {} as any
      global.localStorage = {
        getItem: vi.fn(() => {
          throw new Error('localStorage not available')
        })
      } as any
      expect(getDebugFilter()).toBe(null)
    })

    it('handles process.env.DEBUG as non-string', () => {
      global.process = {
        env: { DEBUG: 123 as any }
      } as any
      expect(getDebugFilter()).toBe(null)
    })

    it('handles incorrectly polyfilled process.env in browser', () => {
      global.window = {} as any
      global.process = {
        env: { DEBUG: 'poly:*' }
      } as any
      expect(getDebugFilter()).toBe('poly:*')
    })

    it('handles serverless/edge runtime where process.env access throws', () => {
      global.process = {
        get env() {
          throw new Error('Cannot access env')
        }
      } as any
      expect(getDebugFilter()).toBe(null)
    })

    it('handles process.env as non-object', () => {
      global.process = {
        env: 'not-an-object' as any
      } as any
      expect(getDebugFilter()).toBe(null)
    })

    it('handles process.env as null', () => {
      global.process = {
        env: null
      } as any
      expect(getDebugFilter()).toBe(null)
    })

    it('handles empty string DEBUG value', () => {
      global.process = {
        env: { DEBUG: '' }
      } as any
      // Empty string is a valid value (enabled but no filter)
      expect(getDebugFilter()).toBe('')
    })

    it('handles localStorage DEBUG as empty string', () => {
      global.window = {} as any
      global.localStorage = {
        getItem: vi.fn((key: string) => key === 'DEBUG' ? '' : null)
      } as any
      expect(getDebugFilter()).toBe('')
    })

    it('distinguishes between null and empty string in localStorage', () => {
      global.window = {} as any
      global.localStorage = {
        getItem: vi.fn((key: string) => key === 'DEBUG' ? null : null)
      } as any
      expect(getDebugFilter()).toBe(null)
    })

    it('handles process.env[key] as undefined vs missing key', () => {
      global.process = {
        env: { DEBUG: undefined }
      } as any
      expect(getDebugFilter()).toBe(null)
    })
  })
})
