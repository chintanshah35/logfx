# logfx-google-cloud

Google Cloud Logging transport for logfx.

## Install

```bash
npm install logfx logfx-google-cloud
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `projectId` | string | yes | GCP project ID |
| `accessToken` | string | yes | OAuth2 access token |
| `logId` | string | no | Log name (default: `logfx`) |
| `resource` | object | no | `{ type, labels }` (default: `{ type: 'global' }`) |
| `labels` | Record<string, string> | no | Entry labels |
| `batchSize` | number | no | Batch size (default: 100) |
| `flushInterval` | number | no | Flush interval ms (default: 5000) |

## Usage

```typescript
import { createLogger } from 'logfx'
import { googleCloudTransport } from 'logfx-google-cloud'

const log = createLogger({
  transports: [
    googleCloudTransport({
      projectId: 'my-project',
      accessToken: process.env.GCP_ACCESS_TOKEN!
    })
  ]
})

log.info('Request received', { userId: 42 })
```

Get access token via `gcloud auth print-access-token` or Application Default Credentials.