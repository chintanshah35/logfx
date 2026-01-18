import type { FastifyRequest, FastifyReply, FastifyPluginCallback } from 'fastify'
import { createLogger } from '../logger'
import type { LoggerOptions } from '../types'
import { generateRequestId } from '../utils'

export interface FastifyLoggerOptions extends Partial<LoggerOptions> {
  getId?: (req: FastifyRequest) => string
}

declare module 'fastify' {
  interface FastifyRequest {
    log: ReturnType<typeof createLogger>
    requestId: string
  }
}

export const fastifyLogger: FastifyPluginCallback<FastifyLoggerOptions> = (fastify, options, done) => {
  const { getId, ...loggerOptions } = options

  fastify.addHook('onRequest', async (request, reply) => {
    const requestId = getId ? getId(request) : (request.headers['x-request-id'] as string) ?? generateRequestId()
    request.requestId = requestId
    reply.header('X-Request-Id', requestId)

    request.log = createLogger({
      ...loggerOptions,
      namespace: loggerOptions.namespace ?? 'http',
      requestId
    })

    const startTime = Date.now()
    
    request.log.info('Incoming request', {
      method: request.method,
      url: request.url
    })

    reply.addHook('onSend', async () => {
      const duration = Date.now() - startTime
      const level = reply.statusCode >= 500 ? 'error' : reply.statusCode >= 400 ? 'warn' : 'info'
      
      request.log[level]('Request completed', {
        method: request.method,
        url: request.url,
        status: reply.statusCode,
        durationMs: duration
      })
    })
  })

  done()
}
