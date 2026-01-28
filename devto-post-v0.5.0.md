---
title: "logfx v0.5.0: From Dev Tool to Production Logger"
published: false
description: "Added Express middleware, Fastify plugin, themes, file rotation, and production features to logfx"
tags: express, middleware, logging, nodejs, typescript
canonical_url: https://github.com/chintanshah35/logfx
cover_image: 
---

A few months ago, I shared [logfx](https://dev.to/chintanshah35/your-consolelog-deserves-better-4ack). Since then, I kept adding features to make it production-ready. v0.5.0 is the result - 15+ new features.

## Express Middleware

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

You get `req.log` scoped to each request, automatic timing, and request IDs for tracing. Status codes automatically set the log level (5xx = error, 4xx = warn).

Options:
- Skip routes (health checks)
- Custom request ID extraction
- Configurable headers

## Fastify and Next.js Too

```typescript
// Fastify
import Fastify from 'fastify'
import { fastifyLogger } from 'logfx'

const app = Fastify()
app.register(fastifyLogger())

app.get('/api/data', async (request, reply) => {
  request.log.info('Processing')
  return { ok: true }
})
```

```typescript
// Next.js
import { withLogging } from 'logfx'

export default withLogging(async (req, res) => {
  req.log.info('API called', { path: req.url })
  res.json({ ok: true })
})
```

## Color Themes

Added dracula and monokai themes because the default colors weren't great on every terminal:

```typescript
import { createLogger } from 'logfx'

const log = createLogger({ theme: 'dracula' })
// or 'monokai', 'default'

log.info('Themed output')
log.success('Looks great')
log.error('Easy to spot')
```

Makes logs easier to scan when you're debugging at 2am.

## File Rotation

Logs now rotate automatically when they hit a size limit:

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

Creates `app.log.1`, `app.log.2`, etc. Old files get gzipped. No more disk space issues.

## Issue Detection

This catches mistakes I kept making:

```typescript
const log = createLogger({ detectIssues: true })

log.info('User data', { data: undefined })
// ⚠️ Warning: undefined value in log data

log.info('Auth', { password: 'secret123' })
// ⚠️ Warning: potential password in log data
```

Only runs in development. Helps catch these mistakes before they reach production.

## Format Auto-Detection

Pretty output in dev, JSON in production. No config needed:

```typescript
// Development (NODE_ENV=development)
log.info('Server started')
// 💡 INFO Server started (pretty, colored)

// Production (NODE_ENV=production)
log.info('Server started')
// {"timestamp":"2026-01-19T...","level":"info","message":"Server started"}
```

## Request ID Tracking

Built-in for tracing requests across your logs:

```typescript
const log = createLogger({ requestId: 'req-123' })
log.info('Processing payment')
// Includes requestId in output for correlation
```

Great for debugging issues across microservices.

## Better Error Serialization

Stack traces are readable in dev, structured in prod:

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

## Service Context

Automatically reads service metadata from environment:

```typescript
// Reads SERVICE_NAME, SERVICE_VERSION, NODE_ENV
const log = createLogger()
log.info('Started')

// Output includes:
// {"service":"my-api","version":"1.0.0","environment":"production",...}
```

## Structured JSON Output

Production-ready JSON format for log aggregation tools:

```typescript
const log = createLogger({ format: 'json' })
log.info('User login', { userId: 123 })
// {"timestamp":"2026-01-19T...","level":"info","message":"User login","data":{"userId":123}}
```

Works with Datadog, Splunk, ELK stack, and other log aggregation tools.

## Field Redaction

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

## Log Sampling

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

Useful when you're getting millions of requests.

## Async Logging

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

## Multiple Transports

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

## Webhook Transport

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

## Environment Detection

Automatically adapts to your environment:

- **CI/CD**: Auto-disables colors
- **TTY Detection**: Only shows colors in terminals
- **NO_COLOR/FORCE_COLOR**: Respects standard env vars
- **NODE_ENV**: Auto-switches format (pretty in dev, JSON in prod)

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

## Why I Built This

I wanted a logger that doesn't make you choose between pretty logs in dev and structured logs in prod. Most loggers force you to pick one. logfx does both automatically.

Also wanted something that works in browsers and Node without extra config. Zero dependencies means no supply chain issues.

Request logging middleware was important too. Every project needs it and I didn't want to write it from scratch each time.

## What Makes logfx Different

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

## Installation

```bash
npm install logfx
```

## Quick Start

```typescript
import { log } from 'logfx'

log.debug('Debugging info', { detailed: true })
log.info('Server started', { port: 3000 })
log.success('User created')
log.warn('Memory usage high', { usage: '85%' })
log.error('Connection failed', new Error('Timeout'))
```

**Output:**
```
🔍 DEBUG   Debugging info { detailed: true }
💡 INFO    Server started { port: 3000 }
✅ SUCCESS User created
⚠️ WARN    Memory usage high { usage: '85%' }
🔴 ERROR   Connection failed Error: Timeout
    at ...
```

## What's Next

Working on v0.6.0 with:
- Child loggers with context inheritance
- Edge runtime support (Cloudflare Workers, Vercel Edge)
- Performance benchmarks vs other loggers
- Better transport architecture

## Try It

```bash
npm install logfx@0.5.0
```

**Links:**
- GitHub: [github.com/chintanshah35/logfx](https://github.com/chintanshah35/logfx)
- npm: [npmjs.com/package/logfx](https://www.npmjs.com/package/logfx)
- Release Notes: [v0.5.0 Release](https://github.com/chintanshah35/logfx/releases/tag/v0.5.0)
- Original Post: [Your console.log deserves better](https://dev.to/chintanshah35/your-consolelog-deserves-better-4ack)

---

What logging features would you like to see in v0.6.0? Drop a comment below.
