# logfx-splunk

Splunk HTTP Event Collector (HEC) integration for logfx.

## Install

```bash
npm install logfx logfx-splunk
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `url` | string | yes | Splunk HEC URL (e.g. `https://splunk.example.com:8088`) |
| `token` | string | yes | HEC token |
| `source` | string | no | Event source |
| `sourcetype` | string | no | Event sourcetype |
| `batchSize` | number | no | Batch size (default: 100) |
| `flushInterval` | number | no | Flush interval ms (default: 5000) |

## Usage

```typescript
import { createLogger } from 'logfx'
import { splunkTransport } from 'logfx-splunk'

const log = createLogger({
  transports: [
    splunkTransport({
      url: 'https://splunk.example.com:8088',
      token: 'your-hec-token'
    })
  ]
})

log.info('Request completed', { duration: 42 })
```

Create an HEC token in Splunk: Settings > Data inputs > HTTP Event Collector.