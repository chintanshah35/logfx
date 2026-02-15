# logfx-azure

Azure Monitor Log Analytics transport for logfx.

```typescript
import { createLogger } from 'logfx'
import { azureTransport } from 'logfx-azure'

const log = createLogger({
  transports: [
    azureTransport({
      workspaceId: 'your-workspace-id',
      sharedKey: 'your-primary-key'
    })
  ]
})

log.info('Request received', { userId: 42 })
```

Uses the HTTP Data Collector API. Get workspace ID and key from Log Analytics workspace > Agents.
