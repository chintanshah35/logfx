import type { Transport, LogEntry, FileTransportOptions } from '../types'
import { formatJson } from '../formatters'
import { safeStringify } from '../json'
import { safeConsole } from '../console'
import { getErrorMessage } from '../utils'

const parseSize = (size: number | string): number => {
  if (typeof size === 'number') return size
  
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  }
  
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/)
  if (!match) return 10 * 1024 * 1024
  
  const value = parseFloat(match[1])
  const unit = match[2] || 'b'
  return value * units[unit]
}

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
  const { path, format = 'json', rotation } = options
  
  if (typeof process === 'undefined') {
    safeConsole.warn('fileTransport only works in Node.js')
    return { name: 'file', log: () => {} }
  }

  let fsModule: typeof import('fs') | null = null
  let writeStream: import('fs').WriteStream | null = null
  let pendingWrites: string[] = []
  let initPromise: Promise<void> | null = null
  let initializationError: Error | null = null
  let currentSize = 0
  const maxSize = rotation?.maxSize ? parseSize(rotation.maxSize) : null

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

  const shouldRotate = (): boolean => {
    if (!maxSize || !fsModule) return false
    
    try {
      if (fsModule.existsSync(path)) {
        const stats = fsModule.statSync(path)
        return stats.size >= maxSize
      }
    } catch {
      return false
    }
    
    return false
  }

  const cleanupOldFiles = () => {
    if (!fsModule || !rotation?.maxFiles) return
    
    try {
      const files: { path: string; index: number }[] = []
      let index = 1
      
      while (fsModule.existsSync(`${path}.${index}`) || fsModule.existsSync(`${path}.${index}.gz`)) {
        const filePath = fsModule.existsSync(`${path}.${index}.gz`) 
          ? `${path}.${index}.gz` 
          : `${path}.${index}`
        files.push({ path: filePath, index })
        index++
      }
      
      if (files.length >= rotation.maxFiles) {
        const toDelete = files
          .sort((a, b) => b.index - a.index)
          .slice(rotation.maxFiles - 1)
        
        for (const file of toDelete) {
          try {
            fsModule.unlinkSync(file.path)
          } catch {
            // Ignore errors
          }
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  const compressFile = async (filePath: string) => {
    if (!fsModule || !rotation?.compress) return
    
    try {
      const zlib = await import('zlib')
      const { pipeline } = await import('stream')
      const { promisify } = await import('util')
      const pipe = promisify(pipeline)
      
      const source = fsModule.createReadStream(filePath)
      const destination = fsModule.createWriteStream(`${filePath}.gz`)
      const gzip = zlib.createGzip()
      
      await pipe(source, gzip, destination)
      fsModule.unlinkSync(filePath)
    } catch (error) {
      safeConsole.error(`[logfx:file] Compression failed for ${filePath}:`, getErrorMessage(error))
    }
  }

  const rotateFile = async () => {
    if (!fsModule) return
    
    try {
      if (writeStream) {
        writeStream.end()
        writeStream = null
      }
      
      if (!fsModule.existsSync(path)) {
        currentSize = 0
        return
      }
      
      let rotateIndex = 1
      while (fsModule.existsSync(`${path}.${rotateIndex}`) || fsModule.existsSync(`${path}.${rotateIndex}.gz`)) {
        rotateIndex++
      }
      
      const rotatedPath = `${path}.${rotateIndex}`
      fsModule.renameSync(path, rotatedPath)
      currentSize = 0
      
      if (rotation?.compress) {
        compressFile(rotatedPath).catch(() => {})
      }
      
      cleanupOldFiles()
      
      await initialize()
    } catch (error) {
      safeConsole.error(`[logfx:file] Rotation failed for ${path}:`, getErrorMessage(error))
    }
  }

  const writeLine = (line: string) => {
    if (initializationError) {
      return
    }
    
    if (shouldRotate()) {
      rotateFile().catch(() => {})
      pendingWrites.push(line)
      return
    }
    
    if (writeStream) {
      try {
        const lineData = line + '\n'
        const written = writeStream.write(lineData)
        currentSize += Buffer.byteLength(lineData)
        
        if (!written) {
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
    
    if (pendingWrites.length > 0) {
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
        const stream = writeStream
        writeStream = null
        return new Promise<void>((resolve) => {
          stream.end(() => {
            resolve()
          })
        })
      }
    }
  }
}
