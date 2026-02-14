# logfx-cloudwatch

AWS CloudWatch Logs transport for logfx.

```typescript
import { createLogger } from 'logfx'
import { cloudwatchTransport } from 'logfx-cloudwatch'

const log = createLogger({
  transports: [
    cloudwatchTransport({
      logGroupName: '/myapp/logs',
      logStreamName: 'api',
      region: 'us-east-1'
    })
  ]
})

log.info('Request received', { userId: 42 })
```

Uses default AWS credential chain (env vars, IAM role, etc.). Or pass `credentials: { accessKeyId, secretAccessKey }`.
