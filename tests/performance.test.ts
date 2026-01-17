import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLogger } from '../src/index'

describe('Performance metrics', () => {
  let spies: Record<string, ReturnType<typeof vi.spyOn>>

  beforeEach(() => {
    spies = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
    }
  })

  afterEach(() => vi.restoreAllMocks())

  it('tracks timing with time/timeEnd', () => {
    const log = createLogger()
    log.time('test')
    log.timeEnd('test')
    expect(spies.debug).toHaveBeenCalled()
  })

  it('measures async operations', async () => {
    const log = createLogger()
    const result = await log.measure('async-test', async () => {
      return 'done'
    })
    expect(result.result).toBe('done')
    expect(result.duration).toBeGreaterThanOrEqual(0)
  })
})
