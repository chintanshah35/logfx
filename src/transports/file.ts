import type { Transport, LogEntry, FileTransportOptions } from '../types'
import { formatJson } from '../formatters'

const formatPlainText = (entry: LogEntry): string => {
  const timestamp = entry.timestamp.toISOString()
  const level = entry.level.toUpperCase().padEnd(7)
  const namespace = entry.namespace ? `[${entry.namespace}] ` : ''
  
  let line = `${timestamp} ${level} ${namespace}${entry.message}`
  
  if (entry.data && Object.keys(entry.data).length > 0) {
    line += ' ' + JSON.stringify(entry.data)
  }
  if (entry.error) {
    line += '\n' + (entry.error.stack || entry.error.message)
  }
  
  return line
}

export const fileTransport = (options: FileTransportOptions): Transport => {
  const { path, format = 'json' } = options
  
  if (typeof process === 'undefined') {
    console.warn('fileTransport only works in Node.js')
    return { name: 'file', log: () => {} }
  }

  let fsModule: typeof import('fs') | null = null
  let writeStream: import('fs').WriteStream | null = null
  let pendingWrites: string[] = []

  const initialize = async () => {
    if (fsModule) return
    try {
      fsModule = await import('fs')
      const directory = path.substring(0, path.lastIndexOf('/'))
      if (directory && !fsModule.existsSync(directory)) {
        fsModule.mkdirSync(directory, { recursive: true })
      }
      writeStream = fsModule.createWriteStream(path, { flags: 'a' })
    } catch {
      console.warn(`fileTransport: failed to open ${path}`)
    }
  }

  const writeLine = (line: string) => {
    if (writeStream) {
      writeStream.write(line + '\n')
    } else {
      pendingWrites.push(line)
    }
  }

  initialize()

  return {
    name: 'file',
    log: (entry: LogEntry) => {
      const line = format === 'json' ? formatJson(entry) : formatPlainText(entry)
      writeLine(line)
    },
    flush: async () => {
      if (writeStream && pendingWrites.length > 0) {
        for (const line of pendingWrites) writeStream.write(line + '\n')
        pendingWrites = []
      }
    },
    close: async () => {
      if (writeStream) {
        writeStream.end()
        writeStream = null
      }
    }
  }
}
