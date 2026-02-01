import { createLogger, transports } from '../src/index'

// Multi-region setup with failover
const log = createLogger({
  transports: [
    transports.webhook({
      urls: [
        'https://us-east-1.logs.example.com/ingest',
        'https://us-west-2.logs.example.com/ingest',
        'https://eu-west-1.logs.example.com/ingest'
      ],
      headers: {
        'Authorization': `Bearer ${process.env.LOG_API_KEY}`
      },
      
      // Round-robin distribution
      failover: {
        strategy: 'round-robin',
        healthCheck: true,
        healthInterval: 30000
      },
      
      // Retry with backoff
      retry: {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 30000,
        backoff: 'exponential'
      },
      
      // Circuit breaker
      circuitBreaker: {
        enabled: true,
        threshold: 5,
        timeout: 30000,
        halfOpenMaxCalls: 1
      },
      
      // Dead letter queue
      dlq: {
        enabled: true,
        maxSize: 1000,
        overflow: 'drop-oldest',
        persist: './logs/dlq.json'
      }
    })
  ]
})

// Usage
log.info('Application started', {
  version: '1.0.0',
  environment: process.env.NODE_ENV
})

log.error('Database connection failed', new Error('ECONNREFUSED'))

// Graceful shutdown
process.on('SIGTERM', async () => {
  log.info('Shutting down gracefully')
  await log.flush()
  await log.close()
  process.exit(0)
})
