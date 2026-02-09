import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLogger, transports } from '../src/index'

describe('Beacon Transport', () => {
  let sendBeaconMock: ReturnType<typeof vi.fn>
  let fetchMock: ReturnType<typeof vi.fn>
  let originalSendBeacon: any
  let originalFetch: typeof global.fetch
  let originalWindow: any
  let originalDocument: any

  beforeEach(() => {
    originalSendBeacon = (global as any).navigator?.sendBeacon
    originalFetch = global.fetch
    originalWindow = global.window
    originalDocument = global.document
    
    sendBeaconMock = vi.fn().mockReturnValue(true)
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    
    global.fetch = fetchMock
    
    if (!(global as any).window) {
      (global as any).window = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }
    }
    
    if (!(global as any).document) {
      (global as any).document = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        visibilityState: 'visible'
      }
    }
    
    if (!(global as any).navigator) {
      (global as any).navigator = {}
    }
    
    (global as any).navigator.sendBeacon = sendBeaconMock
    
    if (!(global as any).Blob) {
      (global as any).Blob = class Blob {
        constructor(public parts: any[], public options: any) {}
      }
    }
  })

  afterEach(() => {
    if (originalSendBeacon) {
      (global as any).navigator.sendBeacon = originalSendBeacon
    }
    global.fetch = originalFetch
    if (originalWindow === undefined) {
      delete (global as any).window
    } else {
      (global as any).window = originalWindow
    }
    if (originalDocument === undefined) {
      delete (global as any).document
    } else {
      (global as any).document = originalDocument
    }
    vi.clearAllMocks()
  })

  it('uses sendBeacon to send logs', async () => {
    const log = createLogger({
      transports: [transports.beacon({ 
        url: '/api/logs'
      })]
    })

    log.info('test message')
    await new Promise(resolve => queueMicrotask(resolve))
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(sendBeaconMock.mock.calls.length).toBeGreaterThanOrEqual(1)
    expect(sendBeaconMock.mock.calls[0][0]).toBe('/api/logs')
  })

  it('falls back to fetch when sendBeacon fails', async () => {
    sendBeaconMock.mockReturnValue(false)

    const log = createLogger({
      transports: [transports.beacon({ 
        url: '/api/logs'
      })]
    })

    log.info('test message')
    await new Promise(resolve => queueMicrotask(resolve))
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(sendBeaconMock.mock.calls.length).toBeGreaterThanOrEqual(1)
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(1)
  })

  it('splits large payloads', async () => {
    const log = createLogger({
      transports: [transports.beacon({ 
        url: '/api/logs',
        maxPayloadSize: 200
      })]
    })

    log.info('test1', { data: 'x'.repeat(50) })
    log.info('test2', { data: 'x'.repeat(50) })
    log.info('test3', { data: 'x'.repeat(50) })
    await new Promise(resolve => queueMicrotask(resolve))
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(sendBeaconMock.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('respects maxPayloadSize limit', async () => {
    const log = createLogger({
      transports: [transports.beacon({ 
        url: '/api/logs',
        maxPayloadSize: 5000
      })]
    })

    log.info('small message')
    await new Promise(resolve => queueMicrotask(resolve))
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(sendBeaconMock.mock.calls.length).toBeGreaterThanOrEqual(1)
  })
})
