# logfx-honeycomb

Honeycomb Events API integration for logfx.

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

Create an Ingest API key in Honeycomb: Environment Settings > API Keys > Ingest tab. For EU, use `host: 'https://api.eu1.honeycomb.io'`.
