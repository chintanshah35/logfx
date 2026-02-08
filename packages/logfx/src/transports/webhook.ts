import type { Transport, LogEntry, WebhookTransportOptions } from '../types'
import { formatJson } from '../formatters'
import { safeConsole } from '../console'
import { getErrorMessage } from '../utils'

let fs: typeof import('fs') | null = null
if (typeof process !== 'undefined' && typeof require !== 'undefined') {
  try {
    fs = require('fs')
  } catch {
    // Browser environment or fs not available
  }
}

export const webhookTransport = (options: WebhookTransportOptions): Transport => {
  const { 
    url, 
    urls,
    headers = {}, 
    method = 'POST',
    batchSize = 10,
    flushInterval = 5000,
    retry,
    circuitBreaker,
    dlq,
    failover
  } = options

  const endpoints = urls && urls.length > 0 ? urls : [url]
  const maxBufferSize = options.maxBufferSize ?? (batchSize * 10)
  const timeout = options.timeout ?? 30000

  const failoverConfig = {
    strategy: failover?.strategy ?? 'round-robin' as const,
    healthCheck: failover?.healthCheck ?? false,
    healthInterval: failover?.healthInterval ?? 30000
  }

  let currentEndpointIndex = 0
  const endpointHealth = new Map<string, { healthy: boolean; lastCheck: number }>()

  const retryConfig = {
    maxRetries: retry?.maxRetries ?? 3,
    initialDelay: retry?.initialDelay ?? 1000,
    maxDelay: retry?.maxDelay ?? 30000,
    backoff: retry?.backoff ?? 'exponential' as const,
    retryOn: retry?.retryOn ?? [500, 502, 503, 504, 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND']
  }

  const cbConfig = {
    enabled: circuitBreaker?.enabled ?? false,
    threshold: circuitBreaker?.threshold ?? 5,
    timeout: circuitBreaker?.timeout ?? 30000,
    halfOpenMaxCalls: circuitBreaker?.halfOpenMaxCalls ?? 1
  }

  const dlqConfig = {
    enabled: dlq?.enabled ?? false,
    maxSize: dlq?.maxSize ?? 1000,
    overflow: dlq?.overflow ?? 'drop-oldest' as const,
    persist: dlq?.persist
  }

  let buffer: LogEntry[] = []
  let flushTimer: ReturnType<typeof setTimeout> | null = null
  let isFlushing = false

  let circuitState: 'closed' | 'open' | 'half-open' = 'closed'
  let failureCount = 0
  let circuitOpenTime: number | null = null
  let halfOpenAttempts = 0

  let deadLetterQueue: LogEntry[] = []

  const shouldRetry = (error: unknown, statusCode?: number): boolean => {
    if (statusCode && retryConfig.retryOn.includes(statusCode)) {
      return true
    }
    
    if (error instanceof Error) {
      const errorCode = (error as NodeJS.ErrnoException).code
      if (errorCode && retryConfig.retryOn.includes(errorCode)) {
        return true
      }
      if (error.name === 'AbortError' && retryConfig.retryOn.includes('ETIMEDOUT')) {
        return true
      }
    }
    
    return false
  }

  const calculateDelay = (attempt: number): number => {
    let delay: number
    
    switch (retryConfig.backoff) {
      case 'exponential':
        delay = retryConfig.initialDelay * Math.pow(2, attempt)
        break
      case 'linear':
        delay = retryConfig.initialDelay * (attempt + 1)
        break
      case 'fixed':
      default:
        delay = retryConfig.initialDelay
    }
    
    delay = Math.min(delay, retryConfig.maxDelay)
    
    // Add jitter (±25%) to prevent thundering herd problem
    const jitter = delay * 0.25 * (Math.random() * 2 - 1)
    return Math.floor(delay + jitter)
  }

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const checkCircuitState = (): boolean => {
    if (!cbConfig.enabled) return true
    
    if (circuitState === 'open') {
      if (circuitOpenTime && Date.now() - circuitOpenTime >= cbConfig.timeout) {
        safeConsole.info('[logfx:webhook] Circuit breaker entering half-open state')
        circuitState = 'half-open'
        halfOpenAttempts = 0
        return true
      }
      return false
    }
    
    if (circuitState === 'half-open') {
      return halfOpenAttempts < cbConfig.halfOpenMaxCalls
    }
    
    return true
  }

  const recordSuccess = () => {
    if (!cbConfig.enabled) return
    
    if (circuitState === 'half-open') {
      safeConsole.info('[logfx:webhook] Circuit breaker closing after successful request')
      circuitState = 'closed'
      failureCount = 0
      halfOpenAttempts = 0
      circuitOpenTime = null
    } else if (circuitState === 'closed') {
      failureCount = 0
    }
  }

  const recordFailure = () => {
    if (!cbConfig.enabled) return
    
    if (circuitState === 'half-open') {
      safeConsole.warn('[logfx:webhook] Circuit breaker re-opening after failed request')
      circuitState = 'open'
      circuitOpenTime = Date.now()
      halfOpenAttempts = 0
      return
    }
    
    if (circuitState === 'closed') {
      failureCount++
      if (failureCount >= cbConfig.threshold) {
        safeConsole.error(`[logfx:webhook] Circuit breaker opened after ${failureCount} failures`)
        circuitState = 'open'
        circuitOpenTime = Date.now()
      }
    }
  }

  const addToDeadLetterQueue = (entries: LogEntry[]) => {
    if (!dlqConfig.enabled) return
    
    for (const entry of entries) {
      if (deadLetterQueue.length >= dlqConfig.maxSize) {
        if (dlqConfig.overflow === 'drop-oldest') {
          deadLetterQueue.shift()
        } else {
          continue
        }
      }
      deadLetterQueue.push(entry)
    }
    
    safeConsole.warn(`[logfx:webhook] Added ${entries.length} logs to dead letter queue (${deadLetterQueue.length}/${dlqConfig.maxSize})`)
    
    if (dlqConfig.persist && fs) {
      try {
        const data = JSON.stringify(deadLetterQueue, null, 2)
        fs.writeFileSync(dlqConfig.persist, data, 'utf-8')
      } catch (error) {
        safeConsole.error('[logfx:webhook] Failed to persist DLQ:', getErrorMessage(error))
      }
    }
  }

  const loadDeadLetterQueue = () => {
    if (!dlqConfig.enabled || !dlqConfig.persist || !fs) return
    
    try {
      if (fs.existsSync(dlqConfig.persist)) {
        const data = fs.readFileSync(dlqConfig.persist, 'utf-8')
        deadLetterQueue = JSON.parse(data)
        safeConsole.info(`[logfx:webhook] Loaded ${deadLetterQueue.length} logs from DLQ`)
      }
    } catch (error) {
      safeConsole.error('[logfx:webhook] Failed to load DLQ:', getErrorMessage(error))
    }
  }

  const getNextEndpoint = (): string => {
    if (endpoints.length === 1) return endpoints[0]

    switch (failoverConfig.strategy) {
      case 'round-robin':
        const endpoint = endpoints[currentEndpointIndex]
        currentEndpointIndex = (currentEndpointIndex + 1) % endpoints.length
        return endpoint

      case 'priority':
        for (const ep of endpoints) {
          const health = endpointHealth.get(ep)
          if (!health || health.healthy) {
            return ep
          }
        }
        return endpoints[0]

      case 'latency':
        return endpoints[0]

      default:
        return endpoints[0]
    }
  }

  const markEndpointHealth = (endpoint: string, healthy: boolean) => {
    endpointHealth.set(endpoint, {
      healthy,
      lastCheck: Date.now()
    })
  }

  const performHealthCheck = async (endpoint: string): Promise<boolean> => {
    if (!failoverConfig.healthCheck) return true

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(endpoint, {
        method: 'HEAD',
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      return response.ok
    } catch {
      return false
    }
  }

  const startHealthChecks = () => {
    if (!failoverConfig.healthCheck || endpoints.length <= 1) return

    setInterval(async () => {
      for (const endpoint of endpoints) {
        const healthy = await performHealthCheck(endpoint)
        markEndpointHealth(endpoint, healthy)
      }
    }, failoverConfig.healthInterval)
  }

  loadDeadLetterQueue()
  startHealthChecks()

  const sendLogs = async (entries: LogEntry[]) => {
    if (entries.length === 0) return

    if (!checkCircuitState()) {
      safeConsole.warn('[logfx:webhook] Circuit breaker is open, adding logs to dead letter queue')
      addToDeadLetterQueue(entries)
      return
    }

    if (circuitState === 'half-open') {
      halfOpenAttempts++
    }

    const body = JSON.stringify(entries.map(entry => JSON.parse(formatJson(entry))))
    let finalError: unknown = null

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      const targetUrl = getNextEndpoint()
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      try {
        const response = await fetch(targetUrl, {
          method,
          headers: { 'Content-Type': 'application/json', ...headers },
          body,
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          markEndpointHealth(targetUrl, false)
          
          if (shouldRetry(null, response.status) && attempt < retryConfig.maxRetries) {
            const delay = calculateDelay(attempt)
            safeConsole.warn(`[logfx:webhook] HTTP ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${retryConfig.maxRetries})`)
            await sleep(delay)
            continue
          }
          
          safeConsole.error(`[logfx:webhook] HTTP ${response.status} ${response.statusText} for ${targetUrl}`)
          finalError = new Error(`HTTP ${response.status}`)
          recordFailure()
          addToDeadLetterQueue(entries)
          return
        }
        
        markEndpointHealth(targetUrl, true)
        recordSuccess()
        return
      } catch (error) {
        clearTimeout(timeoutId)
        
        if (shouldRetry(error) && attempt < retryConfig.maxRetries) {
          const delay = calculateDelay(attempt)
          const errorMsg = error instanceof Error && error.name === 'AbortError' 
            ? 'timeout' 
            : getErrorMessage(error)
          safeConsole.warn(`[logfx:webhook] ${errorMsg}, retrying in ${delay}ms (attempt ${attempt + 1}/${retryConfig.maxRetries})`)
          await sleep(delay)
          continue
        }
        
        if (error instanceof Error && error.name === 'AbortError') {
          safeConsole.error(`[logfx:webhook] Request timeout after ${timeout}ms for ${url}`)
        } else {
          safeConsole.error('[logfx:webhook] Failed to send logs:', getErrorMessage(error))
        }
        
        finalError = error
        recordFailure()
        addToDeadLetterQueue(entries)
        return
      }
    }
  }

  const flushBuffer = async () => {
    if (buffer.length === 0 || isFlushing) return
    
    isFlushing = true
    try {
      // Atomic operation: splice removes and returns entries atomically
      const toSend = buffer.splice(0, buffer.length)
      if (toSend.length > 0) {
        await sendLogs(toSend)
      }
    } finally {
      isFlushing = false
    }
  }

  const scheduleFlush = () => {
    if (flushTimer) return
    flushTimer = setTimeout(async () => {
      flushTimer = null
      await flushBuffer()
    }, flushInterval)
    
    if (flushTimer && typeof flushTimer.unref === 'function') {
      flushTimer.unref()
    }
  }

  return {
    name: 'webhook',
    log: (entry: LogEntry) => {
      if (buffer.length >= maxBufferSize) {
        buffer.shift()
        safeConsole.warn(`[logfx:webhook] Buffer full, dropping oldest log. Consider increasing maxBufferSize or batchSize.`)
      }
      
      buffer.push(entry)
      
      if (buffer.length >= batchSize) {
        flushBuffer()
      } else {
        scheduleFlush()
      }
    },
    flush: async () => {
      if (flushTimer) {
        clearTimeout(flushTimer)
        flushTimer = null
      }
      await flushBuffer()
    },
    close: async () => {
      if (flushTimer) {
        clearTimeout(flushTimer)
        flushTimer = null
      }
      await flushBuffer()
    }
  }
}
