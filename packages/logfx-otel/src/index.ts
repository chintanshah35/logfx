import type { Transport, LogEntry } from 'logfx'
import { trace, SpanStatusCode } from '@opentelemetry/api'
import type { SpanAttributes } from '@opentelemetry/api'

export interface OtelTransportOptions {
  serviceName?: string
  includeContext?: boolean
  mapLevelToSpanStatus?: boolean
}

export const otelTransport = (options: OtelTransportOptions = {}): Transport => {
  const serviceName = options.serviceName ?? 'logfx'
  const includeContext = options.includeContext ?? true
  const mapLevelToSpanStatus = options.mapLevelToSpanStatus ?? true

  return {
    name: 'otel',
    log: (entry: LogEntry) => {
      const tracer = trace.getTracer(serviceName)
      const activeSpan = trace.getActiveSpan()

      if (activeSpan) {
        const attributes: SpanAttributes = {
          'log.level': entry.level,
          'log.message': entry.message,
          'log.timestamp': entry.timestamp.toISOString(),
        }

        if (entry.namespace) {
          attributes['log.namespace'] = entry.namespace
        }

        if (entry.requestId) {
          attributes['log.request_id'] = entry.requestId
        }

        if (entry.data && includeContext) {
          for (const [key, value] of Object.entries(entry.data)) {
            attributes[`log.data.${key}`] = JSON.stringify(value)
          }
        }

        if (entry.error) {
          attributes['log.error.message'] = entry.error?.message ?? String(entry.error)
          if (entry.error?.stack) attributes['log.error.stack'] = entry.error.stack
          activeSpan.recordException(entry.error)
        }

        activeSpan.addEvent(entry.message, attributes)

        if (mapLevelToSpanStatus && (entry.level === 'error' || entry.level === 'warn')) {
          activeSpan.setStatus({
            code: entry.level === 'error' ? SpanStatusCode.ERROR : SpanStatusCode.OK,
            message: entry.message
          })
        }
      } else {
        const spanAttrs: SpanAttributes = {
          'log.level': entry.level,
          'log.namespace': entry.namespace ?? '',
        }
        const span = tracer.startSpan(entry.message, { attributes: spanAttrs })

        if (entry.error) {
          span.recordException(entry.error)
          span.setStatus({ code: SpanStatusCode.ERROR, message: entry.error?.message ?? String(entry.error) })
        }

        span.end()
      }
    }
  }
}

export const getTraceContextFromOtel = () => {
  const activeSpan = trace.getActiveSpan()
  if (!activeSpan) return undefined

  const spanContext = activeSpan.spanContext()
  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
    traceFlags: spanContext.traceFlags
  }
}

export const injectOtelContext = (logger: any) => {
  return {
    ...logger,
    trace: getTraceContextFromOtel
  }
}
