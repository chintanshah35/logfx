import { createLogger } from '../logger'
import type { LoggerOptions, Logger } from '../types'
import { generateRequestId } from '../utils'

export interface FastifyLoggerOptions extends Partial<LoggerOptions> {
  getId?: (req: unknown) => string
}

export interface FastifyLoggerRequest {
  log: Logger
  requestId: string
}

export const fastifyLogger = (options: FastifyLoggerOptions = {}) => {
  const { getId, ...loggerOptions } = options

  return async (fastify: unknown) => {
    const app = fastify as {
      addHook: (hook: string, handler: (request: Record<string, unknown>, reply: Record<string, unknown>) => Promise<void>) => void
    }

    app.addHook('onRequest', async (request, reply) => {
      const req = request as Record<string, unknown> & { headers: Record<string, string>, method: string, url: string }
      const res = reply as { header: (name: string, value: string) => void, statusCode: number, addHook: (hook: string, handler: () => Promise<void>) => void }
      
      const requestId = getId 
        ? getId(request) 
        : (req.headers['x-request-id'] as string) ?? generateRequestId()
      
      req.requestId = requestId
      res.header('X-Request-Id', requestId)

      const logger = createLogger({
        ...loggerOptions,
        namespace: loggerOptions.namespace ?? 'http',
        requestId
      })
      
      req.log = logger

      const startTime = Date.now()
      
      logger.info('Incoming request', {
        method: req?.method ?? 'UNKNOWN',
        url: req?.url ?? 'UNKNOWN'
      })

      res.addHook('onSend', async () => {
        const duration = Date.now() - startTime
        const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'
        
        logger[level]('Request completed', {
          method: req?.method ?? 'UNKNOWN',
          url: req?.url ?? 'UNKNOWN',
          status: res.statusCode,
          durationMs: duration
        })
      })
    })
  }
}
