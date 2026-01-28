# logfx

> Beautiful, colorful console logging with emojis, levels & namespaces

[![npm version](https://img.shields.io/npm/v/logfx.svg)](https://www.npmjs.com/package/logfx)
[![npm downloads](https://img.shields.io/npm/dm/logfx.svg)](https://www.npmjs.com/package/logfx)
[![build](https://github.com/chintanshah35/logfx/actions/workflows/test-suite.yml/badge.svg)](https://github.com/chintanshah35/logfx/actions)
[![node](https://img.shields.io/node/v/logfx.svg)](https://nodejs.org)
[![bundle size](https://img.shields.io/bundlephobia/minzip/logfx)](https://bundlephobia.com/package/logfx)
[![license](https://img.shields.io/npm/l/logfx.svg)](https://github.com/chintanshah35/logfx/blob/main/LICENSE)

## Features

- **Colorful output** with emoji prefixes
- **Namespaces** to organize logs by module
- **Log levels** — `debug`, `info`, `success`, `warn`, `error`
- **Color themes** — dracula, monokai, or custom
- **Issue detection** — warns about undefined values and passwords in logs
- **Auto-silencing** — debug logs hidden in production
- **Timestamps** — optional time display
- **Context** — attach metadata to all logs
- **Field redaction** — hide sensitive data automatically
- **Log sampling** — reduce log volume in production
- **Async logging** — buffer and batch logs for performance
- **Framework middleware** — Express and Fastify support
- **Universal** — works in Node.js and browsers
- **Tiny** — zero dependencies, ~3KB gzipped
- **TypeScript** — full type support

## Installation

```bash
npm install logfx
```

## Quick Start

```typescript
import { log } from 'logfx'

log.debug('Debugging info', { detailed: true })
log.info('Server started', { port: 3000 })
log.success('User created!')
log.warn('Memory usage high', { usage: '85%' })
log.error('Connection failed', new Error('Timeout'))
```

**Output:**
```
🔍 DEBUG   Debugging info { detailed: true }
💡 INFO    Server started { port: 3000 }
✅ SUCCESS User created!
⚠️ WARN    Memory usage high { usage: '85%' }
🔴 ERROR   Connection failed Error: Timeout
    at ...
```

Errors include full stack traces when available.

## Namespaced Loggers

```typescript
import { logger } from 'logfx'

const authLog = logger('auth')
authLog.info('User login attempt')   // 💡 INFO [auth] User login attempt
authLog.success('Login successful')  // ✅ SUCCESS [auth] Login successful
```

**Output:**

```
💡 INFO  [auth] User login attempt
✅ SUCCESS [auth] Login successful
💡 INFO  [database] Connecting...
✅ SUCCESS [database] Connected
```

## Express Middleware

Automatic request logging for Express apps:

```typescript
import express from 'express'
import { expressLogger } from 'logfx/middleware'

const app = express()

app.use(expressLogger())

app.get('/users', (req, res) => {
  req.log.info('Fetching users')
  res.json({ users: [] })
})
```

**Output:**

```
💡 INFO [http] Incoming request { method: 'GET', path: '/users', requestId: 'abc123' }
💡 INFO [http] Fetching users { requestId: 'abc123' }
💡 INFO [http] Request completed { method: 'GET', path: '/users', status: 200, durationMs: 45 }
```

### Middleware Options

```typescript
app.use(expressLogger({
  namespace: 'api',               // Custom namespace
  skip: (req) => req.path === '/health',  // Skip health checks
  includeHeader: true,           // Add X-Request-Id header (default: true)
  headerName: 'X-Trace-Id',      // Custom header name
  getId: (req) => req.headers['x-custom-id']  // Custom ID extractor
}))
```

Each request gets:
- `req.log` - scoped logger with requestId
- `req.requestId` - unique request identifier
- Automatic timing and status code logging

## Fastify Plugin

```typescript
import Fastify from 'fastify'
import { fastifyLogger } from 'logfx/middleware'

const app = Fastify()
app.register(fastifyLogger())

app.get('/users', async (request, reply) => {
  request.log.info('Fetching users')
  return { users: [] }
})
```

## Color Themes

Choose from built-in themes or use the default:

```typescript
const log = createLogger({ theme: 'dracula' })
// or
const log = createLogger({ theme: 'monokai' })
```

Available themes: `default`, `dracula`, `monokai`

## Issue Detection

Catch common logging mistakes in development:

```typescript
const log = createLogger({ detectIssues: true })

log.info('User data', { user: undefined })
// ⚠️ Warning: undefined value detected in log data

log.info('Login', { password: 'secret123' })
// ⚠️ Warning: potential password in log data
```

Helps catch bugs before they reach production. Disabled by default.

## Configuration

```typescript
import { createLogger } from 'logfx'

const log = createLogger({
  namespace: 'api',
  level: 'warn',      // only show warn and error
  timestamp: true,
  enabled: true,
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `namespace` | `string` | - | Prefix for logs |
| `level` | `LogLevel` | `'debug'` | Minimum level to display |
| `timestamp` | `boolean` | `false` | Show timestamps |
| `enabled` | `boolean` | `true` | Enable/disable logging |
| `format` | `'pretty' \| 'json'` | auto | Output format (auto-detects based on NODE_ENV) |
| `theme` | `'default' \| 'dracula' \| 'monokai'` | `'default'` | Color theme |
| `detectIssues` | `boolean` | `false` | Warn about undefined values and passwords |
| `transports` | `Transport[]` | - | Custom transports |
| `context` | `object` | - | Metadata added to all logs |
| `redact` | `RedactOptions` | - | Field redaction config |
| `sampling` | `SamplingOptions` | - | Log sampling rates |
| `async` | `boolean` | `false` | Enable async buffered logging |
| `buffer` | `BufferOptions` | - | Buffer size and flush interval |

### Auto-Detection

logfx automatically picks the right format for your environment:

- **Development** (`NODE_ENV !== 'production'`) → pretty output with colors
- **Production** (`NODE_ENV === 'production'`) → JSON format

Override with explicit `format` option:

```typescript
const log = createLogger({ format: 'json' })  // Force JSON
const log = createLogger({ format: 'pretty' })  // Force pretty
```

## Transports

Send logs to multiple destinations:

```typescript
import { createLogger, transports } from 'logfx'

const log = createLogger({
  transports: [
    transports.console({ format: 'pretty' }),
    transports.file({ path: './logs/app.log' }),
    transports.webhook({ url: 'https://your-api.com/logs' }),
  ]
})
```

### JSON Output for Production

Structured JSON output for log aggregation services:

```typescript
const log = createLogger({
  transports: [
    transports.console({ format: 'json' })
  ]
})

log.info('User login', { userId: 123 })
// {"timestamp":"2025-12-17T...","level":"info","message":"User login","userId":123}
```

File transport format option:

```typescript
transports.file({ 
  path: './logs/app.log',
  format: 'json'  // or 'pretty' for plain text (default: 'json')
})
```

### Available Transports

| Transport | Description |
|-----------|-------------|
| `console` | Pretty or JSON output to stdout |
| `file` | Write to file (Node.js only) |
| `webhook` | POST logs to HTTP endpoint |

### Webhook Transport Options

```typescript
transports.webhook({
  url: 'https://your-api.com/logs',
  method: 'POST',  // default, or 'PUT'
  headers: { 'Authorization': 'Bearer token' },
  batchSize: 10,  // default: 10 logs per batch
  flushInterval: 5000,  // default: 5 seconds
  maxBufferSize: 100,  // default: 10x batchSize, drops oldest when full
  timeout: 30000,  // default: 30 seconds
  
  // Retry configuration
  retry: {
    maxRetries: 3,  // default: 3
    initialDelay: 1000,  // default: 1s
    maxDelay: 30000,  // default: 30s
    backoff: 'exponential',  // default: 'exponential', or 'linear', 'fixed'
    retryOn: [500, 502, 503, 504, 'ECONNRESET', 'ETIMEDOUT']  // default
  }
})
```

**Batching:** Logs are sent automatically when the batch is full or on the flush interval. Oldest logs are dropped if the buffer exceeds maxBufferSize.

**Retry Logic:** Failed requests are automatically retried with exponential backoff. Retries occur on network errors and 5xx status codes by default.

## Context

Attach metadata to all logs from a logger:

```typescript
const log = createLogger({
  context: {
    service: 'api-gateway',
    version: '1.2.0',
    env: process.env.NODE_ENV
  },
  transports: [transports.console({ format: 'json' })]
})

log.info('Request received', { path: '/users' })
// {"service":"api-gateway","version":"1.2.0","env":"production","path":"/users",...}
```

Child loggers inherit and can extend context:

```typescript
const requestLog = log.child('request', { 
  context: { requestId: 'req-123' } 
})
requestLog.info('Processing')
// Includes service, version, env, AND requestId
```

## Field Redaction

Automatically hide sensitive data:

```typescript
const log = createLogger({
  redact: {
    keys: ['password', 'token', 'apiKey'],
    paths: ['user.email', 'config.secret'],
    censor: '[HIDDEN]'  // default: '[REDACTED]'
  },
  transports: [transports.console({ format: 'json' })]
})

log.info('User login', { username: 'john', password: 'secret123' })
// {"username":"john","password":"[HIDDEN]",...}
```

## Log Sampling

Reduce log volume by sampling:

```typescript
const log = createLogger({
  sampling: {
    debug: 0.1,   // 10% of debug logs
    info: 0.5,    // 50% of info logs
    warn: 1.0,    // 100% of warnings
    error: 1.0    // 100% of errors (never sample errors)
  },
  transports: [transports.console()]
})
```

## Async Logging

Buffer logs and flush in batches for better performance:

```typescript
const log = createLogger({
  async: true,
  buffer: {
    size: 100,          // flush after 100 logs
    flushInterval: 5000 // or every 5 seconds
  },
  transports: [transports.file({ path: './app.log' })]
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  await log.flush()
  await log.close()
  process.exit(0)
})
```

## Extended Features

Import only what you need:

```typescript
import { box, table, diff, time, timeEnd, badge } from 'logfx'
```

| Import | Size | What it does |
|--------|------|--------------|
| Core (`log`) | ~2 KB | Basic logging |
| `time/timeEnd` | +80 bytes | Performance timing |
| `box` | +350 bytes | ASCII boxes for banners |
| `table` | +300 bytes | Pretty-print data tables |
| `diff` | +450 bytes | Compare objects |
| Everything | ~3.4 KB | All features |

### Timers

```typescript
time('api-call')
await fetchData()
timeEnd('api-call')  // ⏱️ api-call: 245.32ms
```

### Boxes

```typescript
box('Server Started!', { title: '🚀 My App', borderColor: 'green' })
```
```
╭─ 🚀 My App ─────────────────╮
│  Server Started!            │
╰─────────────────────────────╯
```

### Tables

```typescript
import { table } from 'logfx'

const users = [
  { name: 'John', role: 'Admin', active: true },
  { name: 'Jane', role: 'User', active: false },
]

table(users)
```

**Output:**
```
┌─────────┬─────────┬─────────┐
│ name    │ role    │ active  │
├─────────┼─────────┼─────────┤
│ John    │ Admin   │ true    │
│ Jane    │ User    │ false   │
└─────────┴─────────┴─────────┘
```

### Diff

```typescript
diff({ name: 'John', age: 25 }, { name: 'Jane', age: 25, email: 'jane@example.com' })
```
```
Changes:
  ~ name: "John" → "Jane"
  + email: "jane@example.com"
```

### All-in-One

```typescript
import { createExtendedLogger } from 'logfx'

const log = createExtendedLogger()
log.box('Ready!')
log.table(data)
log.diff(before, after)
```

## API

```typescript
// Core
log.debug(...args)
log.info(...args)
log.success(...args)
log.warn(...args)
log.error(...args)
log.child(namespace, options?)
log.setEnabled(bool)
log.setLevel(level)
log.flush()   // flush buffered logs
log.close()   // flush and close transports

// Extended
time(label) / timeEnd(label)
count(label) / countReset(label)
group(label) / groupEnd()
assert(condition, ...args)
box(message, options?)
table(data)
diff(before, after, label?)
badge(text, color?)
```

## 📚 Articles & Blog Posts

Learn more about logfx:

- **[logfx v0.5.0: From Dev Tool to Production Logger](https://dev.to/chintanshah35/logfx-v050-from-dev-tool-to-production-logger-55nl)** - Dev.to
- **[Your console.log Deserves Better](https://dev.to/chintanshah35/your-consolelog-deserves-better-4ack)** - Dev.to
- **[logfx: Beautiful Console Logging That Actually Makes Sense](https://chintanshah35.hashnode.dev/logfx-beautiful-console-logging-that-actually-makes-sense)** - Hashnode

## License

MIT