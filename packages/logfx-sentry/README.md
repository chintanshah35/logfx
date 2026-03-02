# logfx-sentry

Sentry error tracking integration for logfx.

## Install

```bash
npm install logfx logfx-sentry @sentry/node
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `minLevel` | string | `warn` | Minimum level to capture (`debug`, `info`, `warn`, `error`) |
| `captureContext` | boolean | true | Include log data in Sentry context |
| `tags` | Record<string, string> | {} | Extra tags for all events |

## Usage

```typescript
import { createLogger } from 'logfx'
import { sentryTransport } from 'logfx-sentry'

const log = createLogger({
  transports: [
    sentryTransport({
      minLevel: 'warn',
      captureContext: true
    })
  ]
})

log.error('Payment failed', new Error('Card declined'))
```

Requires `@sentry/node` to be initialized. Captures errors and warnings with namespace and request ID as tags.