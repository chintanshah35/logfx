import { describe, it, expect } from 'vitest'
import { safeStringify } from '../src/json'

describe('safeStringify', () => {
  it('stringifies plain objects', () => {
    expect(safeStringify({ a: 1, b: 'x' })).toBe('{"a":1,"b":"x"}')
  })

  it('handles BigInt', () => {
    expect(safeStringify({ n: BigInt(42) })).toBe('{"n":"42n"}')
  })

  it('replaces circular refs with [Circular]', () => {
    const circular: Record<string, unknown> = { a: 1 }
    circular.self = circular
    expect(safeStringify(circular)).toBe('{"a":1,"self":"[Circular]"}')
  })

  it('handles nested circular refs', () => {
    const outer: Record<string, unknown> = { x: 1 }
    const inner: Record<string, unknown> = { y: 2, parent: outer }
    outer.child = inner
    const result = safeStringify(outer)
    expect(result).toContain('"x":1')
    expect(result).toContain('"y":2')
    expect(result).toContain('[Circular]')
  })

  it('respects space for indentation', () => {
    const result = safeStringify({ a: 1 }, 2)
    expect(result).toContain('\n')
    expect(JSON.parse(result)).toEqual({ a: 1 })
  })

  it('falls back to String for unserializable values', () => {
    const sym = Symbol('test')
    const result = safeStringify({ s: sym })
    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
  })
})
