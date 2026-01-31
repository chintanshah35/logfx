# Transports

Transports define where logs are sent.

## Webhook Transport

Send logs to HTTP endpoints with retry logic and batching.

```typescript
import { createLogger, transports } from 'logfx'

const log = createLogger({
  transports: [
    transports.webhook({
      url: 'https://logs.example.com/ingest',
      method: 'POST',
      headers: { 'Authorization': 'Bearer token' },
      
      // Batching
      batchSize: 10,
      flushInterval: 5000,
      maxBufferSize: 100,
      
      // Retry configuration
      retry: {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 30000,
        backoff: 'exponential',  // or 'linear', 'fixed'
        retryOn: [500, 502, 503, 504, 'ECONNRESET', 'ETIMEDOUT']
      },
      
      // Timeout
      timeout: 30000
    })
  ]
})
```

### Retry Strategies

**Exponential Backoff** (default):
- Attempt 1: 1s delay
- Attempt 2: 2s delay
- Attempt 3: 4s delay
- Attempt 4: 8s delay (capped at maxDelay)

**Linear Backoff**:
- Attempt 1: 1s delay
- Attempt 2: 2s delay
- Attempt 3: 3s delay
- Attempt 4: 4s delay

**Fixed Delay**:
- All attempts: 1s delay (initialDelay)

### Retry Conditions

By default, retries occur on:
- HTTP 500, 502, 503, 504
- Network errors: ECONNRESET, ETIMEDOUT, ENOTFOUND
- Request timeouts

Customize with `retryOn`:
```typescript
retry: {
  retryOn: [500, 503, 'ECONNRESET']  // Only retry on these
}
```

### Circuit Breaker

Prevent cascading failures by stopping requests to failing endpoints:

```typescript
transports.webhook({
  url: 'https://logs.example.com',
  circuitBreaker: {
    enabled: true,
    threshold: 5,           // Open after 5 consecutive failures
    timeout: 30000,         // Stay open for 30s
    halfOpenMaxCalls: 1     // Allow 1 test request in half-open state
  }
})
```

**States:**
- **Closed**: Normal operation, all requests go through
- **Open**: After threshold failures, all requests are blocked
- **Half-Open**: After timeout, allows test requests to check if service recovered

### Dead Letter Queue (DLQ)

Store failed logs for later processing:

```typescript
transports.webhook({
  url: 'https://logs.example.com',
  dlq: {
    enabled: true,
    maxSize: 1000,              // Store up to 1000 failed logs
    overflow: 'drop-oldest',    // or 'drop-newest'
    persist: './logs/dlq.json'  // Optional: save to disk
  }
})
```

Failed logs are stored in memory (and optionally persisted to disk) when:
- Circuit breaker is open
- All retry attempts are exhausted
- Network is unreachable

**Use Cases:**
- Temporary network outages
- Service maintenance windows
- Rate limiting
- Debugging failed deliveries

### Multi-Region Failover

Send logs to multiple endpoints with automatic failover:

```typescript
transports.webhook({
  urls: [
    'https://us-east.logs.example.com',
    'https://us-west.logs.example.com',
    'https://eu.logs.example.com'
  ],
  failover: {
    strategy: 'round-robin',  // or 'priority', 'latency'
    healthCheck: true,
    healthInterval: 30000     // Check health every 30s
  }
})
```

**Strategies:**
- **round-robin**: Distribute requests evenly across all endpoints
- **priority**: Use first healthy endpoint (fallback to next if unhealthy)
- **latency**: Route to fastest endpoint (future enhancement)

**Health Checks:**
When enabled, periodically sends HEAD requests to check endpoint availability.

## File Transport

Write logs to files with rotation and compression.

```typescript
transports.file({
  path: './logs/app.log',
  format: 'json',
  rotation: {
    maxSize: '10MB',
    maxFiles: 5,
    compress: true
  }
})
```

## Console Transport

Output logs to stdout/stderr.

```typescript
transports.console({
  format: 'pretty',  // or 'json'
  colors: true,
  timestamps: true
})
```
