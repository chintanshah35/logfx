# logfx-logtail

Logtail (Better Stack) HTTP ingest integration for logfx.

## Install

```bash
npm install logfx logfx-logtail
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `sourceToken` | string | yes | Better Stack source token |
| `url` | string | no | Ingest URL (default: `https://in.logs.betterstack.com`) |
| `batchSize` | number | no | Batch size (default: 100) |
| `flushInterval` | number | no | Flush interval ms (default: 5000) |

## Usage

```typescript
import { createLogger } from 'logfx'
import { logtailTransport } from 'logfx-logtail'

const log = createLogger({
  transports: [
    logtailTransport({
      sourceToken: process.env.LOGTAIL_SOURCE_TOKEN!
    })
  ]
})

log.info('Request completed', { duration: 42 })
```

Create a source in Better Stack to get your source token. Override `url` if your source uses a different endpoint.