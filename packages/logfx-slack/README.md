# logfx-slack

Slack incoming webhook transport for logfx.

## Install

```bash
npm install logfx logfx-slack
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `webhookUrl` | string | yes | Slack webhook URL |
| `batchSize` | number | no | Batch size (default: 10) |
| `flushInterval` | number | no | Flush interval ms (default: 5000) |

## Usage

```typescript
import { createLogger } from 'logfx'
import { slackTransport } from 'logfx-slack'

const log = createLogger({
  transports: [
    slackTransport({
      webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx'
    })
  ]
})

log.info('Deploy complete', { env: 'prod' })
```

Create a webhook in Slack: Apps > Incoming Webhooks > Add to Slack.