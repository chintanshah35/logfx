# logfx-loki

Grafana Loki integration for logfx.

## Install

```bash
npm install logfx logfx-loki
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `url` | string | yes | Loki URL (e.g. `http://localhost:3100`) |
| `labels` | Record<string, string> | no | Stream labels (default: `{ app: 'logfx' }`) |
| `batchSize` | number | no | Batch size (default: 100) |
| `flushInterval` | number | no | Flush interval ms (default: 5000) |

## Usage

```typescript
import { createLogger } from 'logfx'
import { lokiTransport } from 'logfx-loki'

const log = createLogger({
  transports: [
    lokiTransport({
      url: 'http://localhost:3100',
      labels: { app: 'myapp', env: 'prod' }
    })
  ]
})

log.info('Request processed', { path: '/users' })
```
