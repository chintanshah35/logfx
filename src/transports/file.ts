import type { Transport, LogEntry, FileTransportOptions } from '../types'
import { formatJson } from '../formatters'
import { safeStringify } from '../json'
import { safeConsole } from '../console'
import { getErrorMessage } from '../utils'

const formatPlainText = (entry: LogEntry): string => {
  const timestamp = entry.timestamp.toISOString()
  const level = entry.level.toUpperCase().padEnd(7)
  const namespace = entry.namespace ? `[${entry.namespace}] ` : ''
  
  let line = `${timestamp} ${level} ${namespace}${entry.message}`
  
  if (entry.data && Object.keys(entry.data).length > 0) {
    line += ' ' + safeStringify(entry.data)
  }
  if (entry.error) {
    line += '\n' + (entry.error.stack || entry.error.message)
  }
  
  return line
}

export const fileTransport = (options: FileTransportOptions): Transport => {
  const { path, format = 'json' } = options
  
  if (typeof process === 'undefined') {
    safeConsole.warn('fileTransport only works in Node.js')
    return { name: 'file', log: () => {} }
  }

  let fsModule: typeof import('fs') | null = null
  let writeStream: import('fs').WriteStream | null = null
  let pendingWrites: string[] = []
  let initPromise: Promise<void> | null = null
  let initializationError: Error | null = null

  const initialize = async () => {
    // Promise-based lock to prevent concurrent initializations
    if (initPromise) return initPromise
    
    initPromise = (async () => {
    
    try {
      fsModule = await import('fs')
      
      // Use path utilities to get directory (handles both / and \ on Windows)
      // Fallback to manual parsing if path module not available
      let directory: string
      try {
        const pathModule = await import('path')
        directory = pathModule.dirname(path)
      } catch {
        // Fallback: handle both Unix and Windows paths
        const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
        directory = lastSlash > 0 ? path.substring(0, lastSlash) : ''
      }
      
      // Only create directory if it exists and doesn't already exist
      if (directory && !fsModule.existsSync(directory)) {
        fsModule.mkdirSync(directory, { recursive: true })
      }
      
      writeStream = fsModule.createWriteStream(path, { flags: 'a' })
      
      writeStream.on('error', (error: Error) => {
        safeConsole.error(`[logfx:file] Write error for ${path}:`, error.message)
        writeStream = null
        initializationError = error
      })
      
      // Write any pending writes
      if (pendingWrites.length > 0) {
        const toWrite = pendingWrites.splice(0, pendingWrites.length)
        for (let i = 0; i < toWrite.length; i++) {
          const line = toWrite[i]
          if (writeStream) {
            const written = writeStream.write(line + '\n')
            if (!written) {
              // Backpressure - buffer remaining lines
              pendingWrites.push(...toWrite.slice(i))
              break
            }
          } else {
            pendingWrites.push(line)
          }
        }
      }
    } catch (error) {
      initializationError = error instanceof Error ? error : new Error(String(error))
      safeConsole.error(`[logfx:file] Failed to initialize ${path}:`, getErrorMessage(error))
    } finally {
      // Keep initPromise set even on error to prevent retries
    }
    })()
    
    return initPromise
  }

  const writeLine = (line: string) => {
    // If initialization failed, don't try to write
    if (initializationError) {
      return
    }
    
    if (writeStream) {
      try {
        const written = writeStream.write(line + '\n')
        if (!written) {
          // Backpressure - buffer for later
          pendingWrites.push(line)
        }
      } catch (error) {
        safeConsole.error(`[logfx:file] Write failed for ${path}:`, getErrorMessage(error))
        writeStream = null
        pendingWrites.push(line)
      }
    } else {
      pendingWrites.push(line)
    }
  }

  initialize()

  const flushPending = async () => {
    if (pendingWrites.length === 0) return
    
    // Wait for initialization if still in progress
    await initialize()
    
    if (!writeStream) return
    
    if (writeStream && pendingWrites.length > 0) {
      const toWrite = pendingWrites.splice(0, pendingWrites.length)
      for (const line of toWrite) {
        if (writeStream) {
          try {
            writeStream.write(line + '\n')
          } catch (error) {
            safeConsole.error(`[logfx:file] Flush write failed for ${path}:`, getErrorMessage(error))
            pendingWrites.push(line)
          }
        } else {
          pendingWrites.push(line)
        }
      }
    }
  }

  return {
    name: 'file',
    log: (entry: LogEntry) => {
      const line = format === 'json' ? formatJson(entry) : formatPlainText(entry)
      writeLine(line)
    },
    flush: flushPending,
    close: async () => {
      // Wait for initialization if still in progress
      await initialize()
      
      // Flush pending writes before closing
      await flushPending()
      
      if (writeStream) {
        return new Promise<void>((resolve) => {
          writeStream!.end(() => {
            writeStream = null
            resolve()
          })
        })
      }
    }
  }
}
