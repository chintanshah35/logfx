# logfx-datadog

Datadog APM integration for logfx.

## Install

```bash
npm install logfx logfx-datadog
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `apiKey` | string | yes | Datadog API key (or `DD_API_KEY` env) |
| `service` | string | yes | Service name |
| `host` | string | no | Intake host (default: `http-intake.logs.datadoghq.com`) |
| `tags` | string[] | no | Tags for logs |
| `source` | string | no | Log source (default: `logfx`) |
| `hostname` | string | no | Machine hostname |
| `batchSize` | number | no | Batch size (default: 100) |
| `flushInterval` | number | no | Flush interval ms (default: 5000) |

## Usage

```typescript
import { createLogger } from 'logfx'
import { datadogTransport } from 'logfx-datadog'

const log = createLogger({
  transports: [
    datadogTransport({
      apiKey: process.env.DD_API_KEY!,
      service: 'my-app'
    })
  ]
})

log.info('Request received', { userId: 42 })
```
