import { createLogger } from '../logger'
import type { LoggerOptions, Logger } from '../types'
import { generateRequestId } from '../utils'

export interface NextLoggerOptions extends Partial<LoggerOptions> {}

export interface NextApiRequest {
  method?: string
  url?: string
  headers: Record<string, string | string[] | undefined>
}

export interface NextApiResponse {
  statusCode: number
  setHeader: (name: string, value: string) => void
}

export interface NextApiRequestWithLog extends NextApiRequest {
  log: Logger
  requestId: string
}

export const withLogging = (
  handler: (req: NextApiRequestWithLog, res: NextApiResponse) => Promise<void> | void,
  options: NextLoggerOptions = {}
) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
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
      method: req?.method ?? 'UNKNOWN',
      url: req?.url ?? 'UNKNOWN'
    })

    try {
      await handler(reqWithLog, res)
    } finally {
      const duration = Date.now() - startTime
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'
      
      reqWithLog.log[level]('API complete', {
        method: req?.method ?? 'UNKNOWN',
        url: req?.url ?? 'UNKNOWN',
        status: res.statusCode,
        durationMs: duration
      })
    }
  }
}
