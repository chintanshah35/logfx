/**
 * Local integration test for Datadog and Elasticsearch
 *
 * Usage:
 *   DD_API_KEY=xxx npx tsx scripts/test-local.ts                    # Test Datadog only
 *   ES_NODE=http://localhost:9200 npx tsx scripts/test-local.ts     # Test Elasticsearch only
 *   Both env vars set                                                # Test both
 *
 * Elasticsearch: Run `docker compose up -d` first, then use ES_NODE=http://localhost:9200
 */

import { createLogger, transports } from '../packages/logfx/src/index'
import { datadogTransport } from '../packages/logfx-datadog/src/index'
import { elasticsearchTransport } from '../packages/logfx-elasticsearch/src/index'

const DD_API_KEY = process.env.DD_API_KEY
const ES_NODE = process.env.ES_NODE

const transportsList: Array<{ name: string; config: object }> = [
  { name: 'console', config: transports.console({ format: 'pretty' }) }
]

if (DD_API_KEY) {
  transportsList.push({
    name: 'datadog',
    config: datadogTransport({
      apiKey: DD_API_KEY,
      service: 'logfx-local-test',
      tags: ['env:local', 'source:test-script'],
      batchSize: 1,
      flushInterval: 200
    })
  })
}

if (ES_NODE) {
  transportsList.push({
    name: 'elasticsearch',
    config: elasticsearchTransport({
      node: ES_NODE,
      index: 'logfx-test',
      batchSize: 1,
      flushInterval: 200
    })
  })
}

const transportConfigs = transportsList.map(t => t.config)
const log = createLogger({
  context: { version: '1.0.0', environment: 'local-test' },
  transports: transportConfigs
})

console.log('\n--- logfx Local Integration Test ---\n')
console.log('Active transports:', transportsList.map(t => t.name).join(', '))
if (!DD_API_KEY) console.log('(Datadog skipped: set DD_API_KEY to enable)')
if (!ES_NODE) console.log('(Elasticsearch skipped: set ES_NODE=http://localhost:9200 to enable)')
console.log('')

const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

log.info('Local test started', {
  timestamp: new Date().toISOString(),
  requestId
})

log.info('Request received', {
  requestId,
  method: 'POST',
  path: '/api/users',
  userAgent: 'Mozilla/5.0',
  ip: '192.168.1.100'
})

log.info('Database query', {
  requestId,
  query: 'SELECT * FROM users WHERE id = ?',
  params: ['usr_abc123'],
  duration: 12,
  rowsAffected: 1
})

log.info('External API call', {
  requestId,
  service: 'payment-gateway',
  endpoint: 'POST /charges',
  status: 200,
  duration: 245,
  correlationId: 'ch_xyz789'
})

log.warn('Rate limit approaching', {
  requestId,
  resource: 'api',
  currentUsage: 980,
  limit: 1000,
  resetAt: new Date(Date.now() + 3600000).toISOString()
})

const innerError = new Error('Database connection timeout')
const midError = new Error('Failed to fetch user profile')
midError.cause = innerError
const outerError = new Error('Checkout failed')
outerError.cause = midError

log.error('Checkout failed', outerError, {
  requestId,
  userId: 'usr_abc123',
  orderId: 'ord_def456',
  errorCode: 'CHECKOUT_FAILED',
  retryable: true
})

log.error('Auth failure', new Error('Invalid credentials'), {
  requestId,
  email: 'user@example.com',
  attemptCount: 3,
  lockedUntil: null
})

log.info('Request completed', {
  requestId,
  status: 500,
  duration: 312,
  memoryUsage: process.memoryUsage().heapUsed
})

const run = async () => {
  await new Promise(r => setTimeout(r, 1500))
  await log.close()

  console.log('\n--- Done ---')
  if (DD_API_KEY) console.log('Datadog: Check Logs -> Search for "Local test started"')
  if (ES_NODE) console.log('Elasticsearch: curl http://localhost:9200/logfx-test/_search?pretty')
  console.log('')
}

run()
