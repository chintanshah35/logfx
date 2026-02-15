# logfx-google-cloud

Google Cloud Logging transport for logfx.

```typescript
import { createLogger } from 'logfx'
import { googleCloudTransport } from 'logfx-google-cloud'

const log = createLogger({
  transports: [
    googleCloudTransport({
      projectId: 'my-project',
      accessToken: process.env.GCP_ACCESS_TOKEN
    })
  ]
})

log.info('Request received', { userId: 42 })
```

Get access token via `gcloud auth print-access-token` or Application Default Credentials.
