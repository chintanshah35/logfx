/**
 * logfx demo - run with: npm run demo
 */
import { log, createLogger, logger, createExtendedLogger } from './src/index'
import { box, table, diff, badge, time, timeEnd, count, group, groupEnd, assert } from './src/index'

console.log('\n--- logfx demo ---\n')

// Basic usage
log.debug('Debug message', { detailed: true })
log.info('Server starting on port 3000')
log.success('Connected to database')
log.warn('Memory usage at 85%')
log.error('Request failed', new Error('timeout'))

console.log('\n--- Namespaces ---\n')

const auth = logger('auth')
auth.info('Login attempt', { email: 'user@test.com' })
auth.success('Authenticated')

const db = logger('db')
db.info('Query executed')
db.warn('Slow query detected')

console.log('\n--- Child loggers ---\n')

const app = createLogger({ namespace: 'app' })
const api = app.child('api')
const users = api.child('users')

app.info('Starting')
api.info('Routes loaded')
users.info('User service ready')

console.log('\n--- Timers ---\n')

time('operation')
for (let i = 0; i < 1000000; i++) { Math.random() }
timeEnd('operation')

console.log('\n--- Counters ---\n')

count('clicks')
count('clicks')
count('clicks')

console.log('\n--- Groups ---\n')

group('Request details')
log.info('GET /api/users')
log.info('Status: 200')
groupEnd()

console.log('\n--- Assertions ---\n')

const age = 16
assert(age >= 18, 'Must be 18+', { age })
assert(true, 'This wont show')

console.log('\n--- Box ---\n')

box('Server started', {
  title: 'MyApp v1.0',
  borderColor: 'green',
  borderStyle: 'round'
})

console.log('\n--- Table ---\n')

table([
  { name: 'John', role: 'Admin', active: true },
  { name: 'Jane', role: 'User', active: false },
])

console.log('\n--- Diff ---\n')

diff(
  { name: 'John', age: 25, city: 'NYC' },
  { name: 'John', age: 26, email: 'john@test.com' },
  'Profile update'
)

console.log('\n--- Badges ---\n')

badge('v1.0.0', 'green')
badge('BETA', 'yellow')
badge('prod', 'blue')

console.log('\n--- Extended logger ---\n')

const ext = createExtendedLogger({ namespace: 'ext' })
ext.info('All methods on one object')
ext.badge('READY', 'green')

console.log('\n--- Done ---\n')
