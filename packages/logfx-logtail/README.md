# logfx-logtail

Logtail (Better Stack) HTTP ingest integration for logfx.

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

Create a source in Better Stack to get your source token and ingest URL. The default ingest URL is `https://in.logs.betterstack.com`. Override with `url` if your source uses a different endpoint.
