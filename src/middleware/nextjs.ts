import type { NextApiRequest, NextApiResponse } from 'next'
import { createLogger } from '../logger'
import type { LoggerOptions } from '../types'
import { generateRequestId } from '../utils'

export interface NextLoggerOptions extends Partial<LoggerOptions> {}

export interface NextApiRequestWithLog extends NextApiRequest {
  log: ReturnType<typeof createLogger>
  requestId: string
}

export const withLogging = <T = any>(
  handler: (req: NextApiRequestWithLog, res: NextApiResponse<T>) => Promise<void> | void,
  options: NextLoggerOptions = {}
) => {
  return async (req: NextApiRequest, res: NextApiResponse<T>) => {
    const requestId = (req.headers['x-request-id'] as string) ?? generateRequestId()
    const reqWithLog = req as NextApiRequestWithLog
    reqWithLog.requestId = requestId
    res.setHeader('X-Request-Id', requestId)

    reqWithLog.log = createLogger({
      ...options,
      namespace: options.namespace ?? 'api',
      requestId
    })

    const startTime = Date.now()

    reqWithLog.log.info('API request', {
      method: req.method,
      url: req.url
    })

    try {
      await handler(reqWithLog, res)
    } finally {
      const duration = Date.now() - startTime
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'
      
      reqWithLog.log[level]('API complete', {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        durationMs: duration
      })
    }
  }
}
