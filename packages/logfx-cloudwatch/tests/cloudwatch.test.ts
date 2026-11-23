import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLogger } from 'logfx'
import { cloudwatchTransport } from '../src/index'

const sendMock = vi.fn().mockResolvedValue({})

vi.mock('@aws-sdk/client-cloudwatch-logs', () => ({
  // Vitest 4 requires real function/class for `new` constructors
  CloudWatchLogsClient: vi.fn().mockImplementation(function () {
    return { send: sendMock }
  }),
  PutLogEventsCommand: vi.fn().mockImplementation(function (input: unknown) {
    return input
  })
}))

describe('CloudWatch Transport', () => {
  beforeEach(() => {
    sendMock.mockClear()
    sendMock.mockResolvedValue({})
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('sends CloudWatch log format with message and timestamp', async () => {
    const log = createLogger({
      transports: [
        cloudwatchTransport({
          logGroupName: 'test-group',
          logStreamName: 'test-stream',
          credentials: { accessKeyId: 'key', secretAccessKey: 'secret' },
          batchSize: 1,
          flushInterval: 100
        })
      ]
    })

    log.info('hello', { userId: 42 })
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(sendMock).toHaveBeenCalledTimes(1)
    const call = sendMock.mock.calls[0][0]
    expect(call.logGroupName).toBe('test-group')
    expect(call.logStreamName).toBe('test-stream')
    expect(call.logEvents).toHaveLength(1)

    const payload = JSON.parse(call.logEvents[0].message)
    expect(payload).toMatchObject({
      level: 'info',
      message: 'hello',
      userId: 42
    })
    expect(payload).toHaveProperty('@timestamp')
  })

  it('includes trace context when present', async () => {
    const log = createLogger({
      transports: [
        cloudwatchTransport({
          logGroupName: 'test-group',
          logStreamName: 'test-stream',
          credentials: { accessKeyId: 'key', secretAccessKey: 'secret' },
          batchSize: 1,
          flushInterval: 100
        })
      ],
      trace: () => ({ traceId: 'abc', spanId: 'def' })
    })

    log.info('traced')
    await new Promise((resolve) => setTimeout(resolve, 150))

    const call = sendMock.mock.calls[0][0]
    const payload = JSON.parse(call.logEvents[0].message)
    expect(payload.trace).toEqual({ traceId: 'abc', spanId: 'def' })
  })
})
