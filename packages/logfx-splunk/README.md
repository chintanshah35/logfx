# logfx-splunk

Splunk HTTP Event Collector (HEC) integration for logfx.

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
