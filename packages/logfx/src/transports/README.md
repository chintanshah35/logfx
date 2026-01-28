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
