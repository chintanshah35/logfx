# logfx-cloudwatch

AWS CloudWatch Logs transport for logfx.

## Install

```bash
npm install logfx logfx-cloudwatch
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `logGroupName` | string | yes | CloudWatch log group |
| `logStreamName` | string | yes | Log stream name |
| `region` | string | no | AWS region (default: `AWS_REGION` or `us-east-1`) |
| `credentials` | object | no | `{ accessKeyId, secretAccessKey }` |
| `batchSize` | number | no | Batch size (default: 100) |
| `flushInterval` | number | no | Flush interval ms (default: 5000) |

## Usage

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

Uses default AWS credential chain (env vars, IAM role). Or pass `credentials` explicitly.