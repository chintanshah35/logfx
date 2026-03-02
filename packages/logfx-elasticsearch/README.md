# logfx-elasticsearch

Elasticsearch transport for logfx.

## Install

```bash
npm install logfx logfx-elasticsearch
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `node` | string \| string[] | yes | Elasticsearch node URL(s) |
| `index` | string | no | Index name (default: `logfx`) |
| `auth` | object | no | `{ username, password }` or `{ apiKey }` |
| `batchSize` | number | no | Batch size (default: 100) |
| `flushInterval` | number | no | Flush interval ms (default: 5000) |

## Usage

```typescript
import { createLogger } from 'logfx'
import { elasticsearchTransport } from 'logfx-elasticsearch'

const log = createLogger({
  transports: [
    elasticsearchTransport({
      node: 'http://localhost:9200',
      index: 'myapp-logs'
    })
  ]
})

log.info('Request received', { userId: 42 })
```

Posts to `{node}/_bulk` in NDJSON format. Supports multi-node failover.