import { describe, it, expect } from 'vitest'
import { expressLogger } from '../src/middleware/express'

describe('Express middleware', () => {
  it('creates middleware function', () => {
    const middleware = expressLogger()
    expect(typeof middleware).toBe('function')
    expect(middleware.length).toBe(3)
  })

  it('accepts options', () => {
    const middleware = expressLogger({
      namespace: 'api',
      skip: (req: any) => req.path === '/health'
    })
    expect(typeof middleware).toBe('function')
  })

  it('accepts custom request ID generator', () => {
    const middleware = expressLogger({
      getId: (req: any) => 'custom-id'
    })
    expect(typeof middleware).toBe('function')
  })

  it('allows disabling header', () => {
    const middleware = expressLogger({
      includeHeader: false
    })
    expect(typeof middleware).toBe('function')
  })

  it('allows custom header name', () => {
    const middleware = expressLogger({
      headerName: 'X-Trace-Id'
    })
    expect(typeof middleware).toBe('function')
  })
})
