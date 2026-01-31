import type { Transport, LogEntry, BeaconTransportOptions } from '../types'
import { formatJson } from '../formatters'
import { safeConsole } from '../console'

export const beaconTransport = (options: BeaconTransportOptions): Transport => {
  const {
    url,
    maxPayloadSize = 64000,
    events = {
      beforeunload: true,
      visibilitychange: true,
      pagehide: true
    }
  } = options

  let buffer: LogEntry[] = []
  let isFlushScheduled = false

  const isBrowser = typeof window !== 'undefined' && typeof navigator !== 'undefined'

  const sendBeacon = (entries: LogEntry[]) => {
    if (entries.length === 0) return

    if (!isBrowser || !navigator.sendBeacon) {
      safeConsole.warn('[logfx:beacon] sendBeacon not available, falling back to fetch')
      fallbackToFetch(entries)
      return
    }

    const payload = JSON.stringify(entries.map(entry => JSON.parse(formatJson(entry))))

    if (payload.length > maxPayloadSize) {
      safeConsole.warn(`[logfx:beacon] Payload size ${payload.length} exceeds limit ${maxPayloadSize}, splitting`)
      const half = Math.floor(entries.length / 2)
      sendBeacon(entries.slice(0, half))
      sendBeacon(entries.slice(half))
      return
    }

    const blob = new Blob([payload], { type: 'application/json' })
    const success = navigator.sendBeacon(url, blob)

    if (!success) {
      safeConsole.error('[logfx:beacon] sendBeacon failed, falling back to fetch')
      fallbackToFetch(entries)
    }
  }

  const fallbackToFetch = async (entries: LogEntry[]) => {
    const payload = JSON.stringify(entries.map(entry => JSON.parse(formatJson(entry))))

    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      })
    } catch (error) {
      safeConsole.error('[logfx:beacon] Fallback fetch failed:', error)
    }
  }

  const flushBuffer = () => {
    if (buffer.length === 0) return

    const toSend = buffer.splice(0, buffer.length)
    sendBeacon(toSend)
    isFlushScheduled = false
  }

  const scheduleFlush = () => {
    if (isFlushScheduled) return

    isFlushScheduled = true
    if (typeof queueMicrotask !== 'undefined') {
      queueMicrotask(flushBuffer)
    } else {
      Promise.resolve().then(flushBuffer)
    }
  }

  if (isBrowser) {
    if (events.beforeunload) {
      window.addEventListener('beforeunload', () => {
        flushBuffer()
      })
    }

    if (events.visibilitychange) {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          flushBuffer()
        }
      })
    }

    if (events.pagehide) {
      window.addEventListener('pagehide', () => {
        flushBuffer()
      })
    }
  }

  return {
    name: 'beacon',
    log: (entry: LogEntry) => {
      buffer.push(entry)
      scheduleFlush()
    },
    flush: async () => {
      flushBuffer()
    },
    close: async () => {
      flushBuffer()
    }
  }
}
