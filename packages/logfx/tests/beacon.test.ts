import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLogger, transports } from '../src/index'

describe('Beacon Transport', () => {
  let sendBeaconMock: ReturnType<typeof vi.fn>
  let fetchMock: ReturnType<typeof vi.fn>
  let originalSendBeacon: typeof navigator.sendBeacon
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalSendBeacon = navigator.sendBeacon
    originalFetch = global.fetch
    
    sendBeaconMock = vi.fn().mockReturnValue(true)
    Object.defineProperty(navigator, 'sendBeacon', {
      writable: true,
      value: sendBeaconMock
    })
    
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    global.fetch = fetchMock
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'sendBeacon', {
      writable: true,
      value: originalSendBeacon
    })
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  it('uses sendBeacon to send logs', async () => {
    const log = createLogger({
      transports: [transports.beacon({ 
        url: '/api/logs'
      })]
    })

    log.info('test message')
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(sendBeaconMock).toHaveBeenCalledTimes(1)
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
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(sendBeaconMock).toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalled()
  })

  it('splits large payloads', async () => {
    const log = createLogger({
      transports: [transports.beacon({ 
        url: '/api/logs',
        maxPayloadSize: 100
      })]
    })

    const largeData = 'x'.repeat(200)
    log.info('test', { data: largeData })
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(sendBeaconMock).toHaveBeenCalledTimes(2)
  })

  it('respects maxPayloadSize limit', async () => {
    const log = createLogger({
      transports: [transports.beacon({ 
        url: '/api/logs',
        maxPayloadSize: 50
      })]
    })

    log.info('small message')
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(sendBeaconMock).toHaveBeenCalledTimes(1)
  })
})
