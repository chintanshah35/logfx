# ⚡ logfx

> Beautiful, colorful console logging with emojis, levels & namespaces

[![npm version](https://img.shields.io/npm/v/logfx.svg)](https://www.npmjs.com/package/logfx)
[![npm downloads](https://img.shields.io/npm/dm/logfx.svg)](https://www.npmjs.com/package/logfx)
[![bundle size](https://img.shields.io/bundlephobia/minzip/logfx)](https://bundlephobia.com/package/logfx)
[![license](https://img.shields.io/npm/l/logfx.svg)](https://github.com/chintanshah35/logfx/blob/main/LICENSE)

## ✨ Features

- 🎨 **Colorful Output** — Eye-catching colors for each log level
- 😀 **Emoji Prefixes** — Instantly recognize log types at a glance
- 🏷️ **Namespaces** — Organize logs by module (`auth`, `api`, `db`)
- 📊 **Log Levels** — `debug`, `info`, `success`, `warn`, `error`
- 🔇 **Auto-silencing** — Debug logs hidden in production automatically
- ⏰ **Timestamps** — Optional timestamp display
- 🌐 **Universal** — Works in Node.js and browsers
- 📦 **Tiny** — Zero dependencies, ~2KB gzipped
- 💪 **TypeScript** — Full type support out of the box

## 📦 Installation

```bash
npm install logfx
```

## Quick Start

```typescript
import { log } from 'logfx'

log.debug('Debugging info', { detailed: true })
log.info('Server started', { port: 3000 })
log.success('User created!')
log.warn('Memory usage high', { usage: '85%' })
log.error('Connection failed', new Error('Timeout'))
```

**Output:**
```
🔍 DEBUG   Debugging info { detailed: true }
💡 INFO    Server started { port: 3000 }
✅ SUCCESS User created!
⚠️ WARN    Memory usage high { usage: '85%' }
🔴 ERROR   Connection failed Error: Timeout
```

## Namespaced Loggers

```typescript
import { logger } from 'logfx'

const authLog = logger('auth')
authLog.info('User login attempt')   // 💡 INFO [auth] User login attempt
authLog.success('Login successful')  // ✅ SUCCESS [auth] Login successful
```

**Output:**

```
💡 INFO  [auth] User login attempt
✅ SUCCESS [auth] Login successful
💡 INFO  [database] Connecting...
✅ SUCCESS [database] Connected
```

## Configuration

```typescript
import { createLogger } from 'logfx'

const log = createLogger({
  namespace: 'api',
  level: 'warn',      // only show warn and error
  timestamp: true,
  enabled: true,
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `namespace` | `string` | - | Prefix for logs |
| `level` | `LogLevel` | `'debug'` | Minimum level to display |
| `timestamp` | `boolean` | `false` | Show timestamps |
| `enabled` | `boolean` | `true` | Enable/disable logging |

## Extended Features

Import only what you need:

```typescript
import { box, table, diff, time, timeEnd, badge } from 'logfx'
```

| Import | Size | What it does |
|--------|------|--------------|
| Core (`log`) | ~2 KB | Basic logging |
| `time/timeEnd` | +80 bytes | Performance timing |
| `box` | +350 bytes | ASCII boxes for banners |
| `table` | +300 bytes | Pretty-print data tables |
| `diff` | +450 bytes | Compare objects |
| Everything | ~3.4 KB | All features |

### Timers

```typescript
time('api-call')
await fetchData()
timeEnd('api-call')  // ⏱️ api-call: 245.32ms
```

### Boxes

```typescript
box('Server Started!', { title: '🚀 My App', borderColor: 'green' })
```
```
╭─ 🚀 My App ─────────────────╮
│  Server Started!            │
╰─────────────────────────────╯
```

### Tables

```typescript
import { table } from 'logfx'

const users = [
  { name: 'John', role: 'Admin', active: true },
  { name: 'Jane', role: 'User', active: false },
]

table(users)
```

**Output:**
```
┌─────────┬─────────┬─────────┐
│ name    │ role    │ active  │
├─────────┼─────────┼─────────┤
│ John    │ Admin   │ true    │
│ Jane    │ User    │ false   │
└─────────┴─────────┴─────────┘
```

### Diff

```typescript
diff({ name: 'John', age: 25 }, { name: 'Jane', age: 25, email: 'jane@example.com' })
```
```
📝 Changes:
  ~ name: "John" → "Jane"
  + email: "jane@example.com"
```

### All-in-One

```typescript
import { createExtendedLogger } from 'logfx'

const log = createExtendedLogger()
log.box('Ready!')
log.table(data)
log.diff(before, after)
```

## API

```typescript
// Core
log.debug(...args)
log.info(...args)
log.success(...args)
log.warn(...args)
log.error(...args)
log.child(namespace)
log.setEnabled(bool)
log.setLevel(level)

// Extended
time(label) / timeEnd(label)
count(label) / countReset(label)
group(label) / groupEnd()
assert(condition, ...args)
box(message, options?)
table(data)
diff(before, after, label?)
badge(text, color?)
```

## License

MIT

---

[⭐ Star on GitHub](https://github.com/chintanshah35/logfx) · [📦 npm](https://www.npmjs.com/package/logfx)
