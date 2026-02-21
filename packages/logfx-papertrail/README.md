# logfx-papertrail

Papertrail integration for logfx.

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
