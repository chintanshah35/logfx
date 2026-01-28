# Hashnode Article Update - Add This Content

## At the Very Top (Before existing content)

```markdown
> **🎉 Updated January 2026:** logfx v0.5.0 is now available with Express middleware, Fastify plugin, color themes, file rotation, and 15+ production features. [Jump to what's new](#whats-new-in-v050) or [install now](#installation).
```

---

## Add This Section After Your Introduction

```markdown
## What's New in v0.5.0

Since the original post, I kept adding features to make it production-ready. v0.5.0 combines features from v0.4.0 and v0.5.0 (v0.4.0 was never published separately).

### Express Middleware

Automatic request logging with timing and request IDs:

```typescript
import express from 'express'
import { expressLogger } from 'logfx'

const app = express()
app.use(expressLogger())

app.get('/users', (req, res) => {
  req.log.info('Fetching users', { userId: req.query.id })
  res.json({ users: [] })
})
```

**Output:**

```
💡 INFO [http] Incoming request { method: 'GET', path: '/users', requestId: 'abc123' }
💡 INFO [http] Fetching users { userId: '42' }
💡 INFO [http] Request completed { method: 'GET', path: '/users', status: 200, durationMs: 45 }
```

Features:
- `req.log` - logger scoped to each request
- `req.requestId` - unique identifier for tracing
- Automatic timing for every request
- Status-based levels (error for 5xx, warn for 4xx)
- Configurable skip, headers, custom ID generation

### Fastify Plugin

```typescript
import Fastify from 'fastify'
import { fastifyLogger } from 'logfx'

const app = Fastify()
app.register(fastifyLogger())

app.get('/api/data', async (request, reply) => {
  request.log.info('Processing request')
  return { ok: true }
})
```

### Next.js API Middleware

```typescript
import { withLogging } from 'logfx'

export default withLogging(async (req, res) => {
  req.log.info('API called', { path: req.url })
  res.json({ ok: true })
})
```

### Color Themes

Switch between color schemes for better terminal readability:

```typescript
import { createLogger } from 'logfx'

const log = createLogger({ theme: 'dracula' })
// or 'monokai', 'default'

log.info('Themed output')
log.success('Looks great')
log.error('Easy to spot')
```

Available themes: `default`, `dracula`, `monokai`

### File Rotation

Size-based log rotation with cleanup and compression:

```typescript
import { createLogger, transports } from 'logfx'

const log = createLogger({
  transports: [
    transports.file({
      path: './logs/app.log',
      rotation: {
        maxSize: '10mb',
        maxFiles: 5,
        compress: true  // gzip old files
      }
    })
  ]
})
```

Automatically creates numbered backups: `app.log.1`, `app.log.2`, etc. Old files get gzipped to save space.

### Issue Detection

Catch common logging mistakes in development:

```typescript
const log = createLogger({ detectIssues: true })

log.info('User data', { data: undefined })
// ⚠️ Warning: undefined value in log data

log.info('Auth token', { password: 'secret123' })
// ⚠️ Warning: potential password in log data
```

Only runs in development. Helps catch these mistakes before they reach production.

### Format Auto-Detection

Automatically picks the right format for your environment:

```typescript
// Development (NODE_ENV=development)
log.info('Server started')
// 💡 INFO Server started (pretty, colored)

// Production (NODE_ENV=production)
log.info('Server started')
// {"timestamp":"2026-01-19T...","level":"info","message":"Server started"}
```

No configuration needed. Just works.

### Request ID Tracking

Built-in request ID generation for tracing requests across logs:

```typescript
const log = createLogger({ requestId: 'req-123' })
log.info('Processing payment')
// Includes requestId in output for correlation
```

Essential for debugging issues across microservices.

### Better Error Serialization

Pretty stack traces in dev, structured JSON in production:

```typescript
try {
  await connectDatabase()
} catch (error) {
  log.error('Connection failed', error)
}
```

**Development output:**
```
🔴 ERROR Connection failed
Error: Timeout
    at Database.connect (/app/db.js:45:11)
    at Server.start (/app/server.js:12:5)
```

**Production output:**
```json
{
  "timestamp": "2026-01-19T13:45:00.000Z",
  "level": "error",
  "message": "Connection failed",
  "error": {
    "message": "Timeout",
    "stack": "Error: Timeout\n    at Database.connect...",
    "code": "ETIMEDOUT"
  }
}
```

### Service Context

Automatic service metadata from environment variables:

```typescript
// Reads SERVICE_NAME, SERVICE_VERSION, NODE_ENV
const log = createLogger()
log.info('Started')

// Output includes:
// {"service":"my-api","version":"1.0.0","environment":"production",...}
```

### Structured JSON Output

Production-ready JSON format for log aggregation tools:

```typescript
const log = createLogger({ format: 'json' })
log.info('User login', { userId: 123 })
// {"timestamp":"2026-01-19T...","level":"info","message":"User login","data":{"userId":123}}
```

Works seamlessly with Datadog, Splunk, ELK stack, and other log aggregation tools.

### Field Redaction

Hide sensitive data automatically:

```typescript
const log = createLogger({
  redact: {
    fields: ['password', 'token', 'apiKey'],
    replacement: '***REDACTED***'
  }
})

log.info('User login', { 
  username: 'john', 
  password: 'secret123' 
})
// Output: { username: 'john', password: '***REDACTED***' }
```

### Log Sampling

Reduce log volume in high-traffic scenarios:

```typescript
const log = createLogger({
  sampling: {
    debug: 0.1,  // 10% of debug logs
    info: 0.5,   // 50% of info logs
    error: 1.0   // 100% of errors (always log)
  }
})
```

Useful when handling millions of requests.

### Async Logging

Buffer and batch logs for better performance:

```typescript
const log = createLogger({
  async: true,
  buffer: {
    size: 100,        // flush after 100 logs
    flushInterval: 1000  // or every 1 second
  }
})
```

Prevents logging from blocking your event loop.

### Multiple Transports

Send logs to different destinations simultaneously:

```typescript
import { createLogger, transports } from 'logfx'

const log = createLogger({
  transports: [
    transports.console({ format: 'pretty' }),
    transports.file({ 
      path: './logs/app.log',
      format: 'json'
    }),
    transports.webhook({ 
      url: 'https://logs.example.com/ingest',
      batchSize: 10
    })
  ]
})
```

### Webhook Transport

Send logs to remote endpoints:

```typescript
transports.webhook({
  url: 'https://logs.example.com',
  method: 'POST',
  headers: { 'Authorization': 'Bearer token' },
  batchSize: 10,
  flushInterval: 5000
})
```

Great for custom log aggregation services or alerting systems.

### Environment Detection

Automatically adapts to your environment:

- **CI/CD**: Auto-disables colors
- **TTY Detection**: Only shows colors in terminals
- **NO_COLOR/FORCE_COLOR**: Respects standard env vars
- **NODE_ENV**: Auto-switches format (pretty in dev, JSON in prod)

```

---

## Replace Your Existing "Features" Section With This

```markdown
## Complete Feature List

**Core Logging:**
- 5 log levels (debug, info, success, warn, error)
- Namespaced loggers
- Colorful output with emojis
- Timestamps
- Context metadata

**Production Features:**
- Format auto-detection (pretty/JSON)
- Structured JSON output
- Request ID tracking
- Service context
- Error serialization with stack traces
- Field redaction
- Log sampling
- Async buffered logging

**Transports:**
- Console transport
- File transport with rotation
- Webhook transport
- Multiple transports simultaneously

**Framework Integration:**
- Express middleware
- Fastify plugin
- Next.js API middleware

**Developer Experience:**
- Color themes (default, dracula, monokai)
- Issue detection (undefined values, passwords)
- Environment detection (CI/CD, TTY)
- TypeScript support
- Zero dependencies
```

---

## Add This "Why logfx?" Section (Before Installation)

```markdown
## Why logfx?

**Works everywhere**

One logger for your entire stack:
- Node.js, Bun, Deno
- Browsers (Chrome, Firefox, Safari)
- Express, Fastify, Next.js
- Edge runtimes (coming in v0.6.0)

**Zero dependencies**

No supply chain risk. No version conflicts. No security audits for logging dependencies.

**Lightweight but feature-complete**

- ~11KB gzipped (46KB uncompressed)
- Full TypeScript support
- 117 passing tests
- All the features you need, none you don't

**Beautiful in development, structured in production**

No more choosing between readable logs and production-ready output. logfx automatically switches based on NODE_ENV.
```

---

## Update Your Installation Section To

```markdown
## Installation

```bash
npm install logfx@0.5.0
```

Or with other package managers:

```bash
yarn add logfx@0.5.0
pnpm add logfx@0.5.0
bun add logfx@0.5.0
```
```

---

## Add This "What's Next" Section (Before the end)

```markdown
## What's Next

Working on v0.6.0 with:
- Child loggers with context inheritance
- Edge runtime support (Cloudflare Workers, Vercel Edge)
- Performance benchmarks vs other loggers
- Better transport architecture

Want to contribute or suggest features? Check out the [GitHub repo](https://github.com/chintanshah35/logfx) or drop a comment below.
```

---

## Update Your Links Section To

```markdown
## Links

- **GitHub**: [github.com/chintanshah35/logfx](https://github.com/chintanshah35/logfx)
- **npm**: [npmjs.com/package/logfx](https://www.npmjs.com/package/logfx)
- **Release Notes**: [v0.5.0 Release](https://github.com/chintanshah35/logfx/releases/tag/v0.5.0)
- **dev.to**: [Original Post](https://dev.to/chintanshah35/your-consolelog-deserves-better-4ack)

⭐ Star on GitHub if you find it useful!
```
