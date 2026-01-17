import type { Request, Response, NextFunction } from 'express'
import { createLogger } from '../logger'
import type { LoggerOptions, Logger } from '../types'
import { generateRequestId } from '../utils'

export interface ExpressLoggerOptions extends Partial<LoggerOptions> {
  skip?: (req: Request) => boolean
  getId?: (req: Request) => string
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
  const { skip, getId, ...loggerOptions } = options

  return (req: Request, res: Response, next: NextFunction) => {
    if (skip && skip(req)) {
      return next()
    }

    const requestId = getId ? getId(req) : generateRequestId()
    req.requestId = requestId

    req.log = createLogger({
      ...loggerOptions,
      namespace: loggerOptions.namespace ?? 'http',
      requestId
    })

    next()
  }
}
