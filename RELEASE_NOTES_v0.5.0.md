# logfx v0.5.0 Release Notes

> This release combines features from v0.4.0 and v0.5.0 (v0.4.0 was not published separately)

## New Features

### Format Auto-Detection
Automatically picks the right format for your environment:
- Development → pretty output with colors
- Production → JSON format

```typescript
// Auto-detects based on NODE_ENV
const log = createLogger()

// Or override explicitly
const log = createLogger({ format: 'json' })
```

### Request ID Tracking
Built-in request ID generation for tracing requests across logs:

```typescript
const log = createLogger({ requestId: 'req-123' })
log.info('Processing') // includes requestId in output
```

### Express Middleware
Automatic request logging with timing:

```typescript
import { expressLogger } from 'logfx'

app.use(expressLogger())

app.get('/users', (req, res) => {
  req.log.info('Fetching users') // scoped to this request
  res.json({ users: [] })
})
```

Features:
- `req.log` - logger scoped to request
- `req.requestId` - unique identifier
- Automatic request/response timing
- Status code based log levels (error for 5xx, warn for 4xx)
- Configurable skip, headers, custom ID

### Fastify Plugin

```typescript
import { fastifyLogger } from 'logfx'

app.register(fastifyLogger())
```

### Next.js API Middleware

```typescript
import { withLogging } from 'logfx'

export default withLogging(async (req, res) => {
  req.log.info('API called')
  res.json({ ok: true })
})
```

### File Rotation
Size-based log rotation with cleanup:

```typescript
transports.file({
  path: './logs/app.log',
  rotation: {
    maxSize: '10mb',
    maxFiles: 5,
    compress: true // gzip old files
  }
})
```

- Numbered backups: app.log.1, app.log.2, etc.
- Automatic cleanup of old files
- Optional gzip compression

### Color Themes

```typescript
const log = createLogger({ theme: 'dracula' })
```

Available themes: `default`, `dracula`, `monokai`

### Issue Detection
Catch common logging mistakes in development:

```typescript
const log = createLogger({ detectIssues: true })

log.info('User', { data: undefined })
// ⚠️ Warning: undefined value in log data

log.info('Auth', { password: 'secret' })
// ⚠️ Warning: potential password in log data
```

### Improved Error Serialization
- Pretty printed stack traces with syntax highlighting
- Nested `cause` support
- Error `code` preservation
- Structured JSON output for errors

```typescript
log.error('Failed', new Error('Connection timeout'))
// Pretty stack trace in dev, structured JSON in prod
```

### Service Context
Automatic service metadata from environment:

```typescript
// Reads SERVICE_NAME, SERVICE_VERSION, NODE_ENV
const log = createLogger()
log.info('Started')
// {"service":"my-api","version":"1.0.0","environment":"production",...}
```

### Structured JSON Output
Production-ready JSON format:

```typescript
const log = createLogger({ format: 'json' })
log.info('User login', { userId: 123 })
// {"timestamp":"2026-01-19T...","level":"info","message":"User login","data":{"userId":123}}
```

## Improvements

- CI/CD environment detection (auto-disables colors)
- Respects `NO_COLOR` and `FORCE_COLOR` env vars
- TTY detection for color support
- Improved TypeScript types
- Cleaner error messages

## No Breaking Changes

All existing APIs from v0.3.0 remain fully compatible. This is a drop-in upgrade.

## Installation

```bash
npm install logfx@0.5.0
```

## Full Changelog

**v0.4.0 features (bundled):**
- Format auto-detection
- Request ID tracking
- File rotation with gzip
- Error serialization improvements
- Service context
- Structured JSON output

**v0.5.0 features:**
- Express middleware
- Fastify plugin
- Next.js middleware
- Color themes (dracula, monokai)
- Issue detection (detectIssues flag)
