# logfx-loki

Grafana Loki integration for logfx.

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
