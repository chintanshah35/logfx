# logfx-honeycomb

Honeycomb Events API integration for logfx.

## Install

```bash
npm install logfx logfx-honeycomb
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `apiKey` | string | yes | Honeycomb API key |
| `dataset` | string | yes | Dataset name |
| `host` | string | no | API host (default: `https://api.honeycomb.io`, use `https://api.eu1.honeycomb.io` for EU) |
| `batchSize` | number | no | Batch size (default: 100) |
| `flushInterval` | number | no | Flush interval ms (default: 5000) |

## Usage

```typescript
import { createLogger } from 'logfx'
import { honeycombTransport } from 'logfx-honeycomb'

const log = createLogger({
  transports: [
    honeycombTransport({
      apiKey: process.env.HONEYCOMB_API_KEY!,
      dataset: 'my-app-logs'
    })
  ]
})

log.info('Request completed', { duration: 42 })
```

Create an Ingest API key in Honeycomb: Environment Settings > API Keys > Ingest tab.