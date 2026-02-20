# logfx-slack

Slack incoming webhook transport for logfx.

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
