# logfx-papertrail

Papertrail integration for logfx.

## Install

```bash
npm install logfx logfx-papertrail
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `url` | string | yes | Papertrail HTTP ingest URL |
| `batchSize` | number | no | Batch size (default: 100) |
| `flushInterval` | number | no | Flush interval ms (default: 5000) |

## Usage

```typescript
import { createLogger } from 'logfx'
import { papertrailTransport } from 'logfx-papertrail'

const log = createLogger({
  transports: [
    papertrailTransport({
      url: 'https://logs.papertrailapp.com/destinations/xxx'
    })
  ]
})

log.info('Deploy started', { version: '1.0.0' })
```

Configure the URL in your Papertrail destination settings for HTTP ingest.