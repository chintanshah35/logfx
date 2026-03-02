# logfx-azure

Azure Monitor Log Analytics transport for logfx.

## Install

```bash
npm install logfx logfx-azure
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `workspaceId` | string | yes | Log Analytics workspace ID |
| `sharedKey` | string | yes | Primary key from workspace |
| `logType` | string | no | Log type (default: `LogFx`) |
| `batchSize` | number | no | Batch size (default: 100) |
| `flushInterval` | number | no | Flush interval ms (default: 5000) |

## Usage

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