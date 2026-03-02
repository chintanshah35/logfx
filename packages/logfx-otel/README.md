# logfx-otel

OpenTelemetry integration for logfx. Attaches log entries to active spans as span events.

## Install

```bash
npm install logfx logfx-otel @opentelemetry/api
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `serviceName` | string | `logfx` | Tracer service name |
| `includeContext` | boolean | true | Include log data as span attributes |
| `mapLevelToSpanStatus` | boolean | true | Map error/warn to span status |

## Usage

```typescript
import { createLogger } from 'logfx'
import { otelTransport } from 'logfx-otel'

const log = createLogger({
  transports: [
    otelTransport({
      serviceName: 'my-app',
      includeContext: true,
      mapLevelToSpanStatus: true
    })
  ]
})

log.info('Processing request', { requestId: 'abc' })
```

Requires an OTLP exporter (e.g. `@opentelemetry/exporter-trace-otlp-http`). Logs appear as span events in your traces.