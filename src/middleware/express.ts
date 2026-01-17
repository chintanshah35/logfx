import type { Request, Response, NextFunction } from 'express'
import { createLogger } from '../logger'
import type { LoggerOptions, Logger } from '../types'
import { generateRequestId } from '../utils'

export interface ExpressLoggerOptions extends Partial<LoggerOptions> {
  skip?: (req: Request) => boolean
  getId?: (req: Request) => string
  includeHeader?: boolean
  headerName?: string
}

declare global {
  namespace Express {
    interface Request {
      log: Logger
      requestId: string
    }
  }
}

export const expressLogger = (options: ExpressLoggerOptions = {}) => {
  const { skip, getId, includeHeader = true, headerName = 'X-Request-Id', ...loggerOptions } = options

  return (req: Request, res: Response, next: NextFunction) => {
    if (skip && skip(req)) {
      return next()
    }

    const requestId = getId ? getId(req) : (req.headers['x-request-id'] as string) ?? generateRequestId()
    req.requestId = requestId

    if (includeHeader) {
      res.setHeader(headerName, requestId)
    }

    req.log = createLogger({
      ...loggerOptions,
      namespace: loggerOptions.namespace ?? 'http',
      requestId
    })

    const startTime = Date.now()

    req.log.info('Incoming request', {
      method: req.method,
      path: req.path,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      ip: req.ip
    })

    const logCompletion = () => {
      const duration = Date.now() - startTime
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'
      
      const data: Record<string, unknown> = {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: duration
      }

      if (duration > 1000) {
        data.slow = true
      }

      req.log[level]('Request completed', data)
    }

    res.on('finish', logCompletion)
    res.on('close', () => {
      if (!res.writableEnded) {
        req.log.warn('Connection closed before response', {
          method: req.method,
          path: req.path,
          durationMs: Date.now() - startTime
        })
      }
    })

    next()
  }
}
