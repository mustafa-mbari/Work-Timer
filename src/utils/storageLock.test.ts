import { describe, it, expect, vi } from 'vitest'
import { withStorageLock } from './storageLock'

describe('withStorageLock', () => {
  it('serializes concurrent operations on the same key', async () => {
    const order: number[] = []

    const op = (id: number, delayMs: number) =>
      withStorageLock('same-key', async () => {
        order.push(id)
        await new Promise(resolve => setTimeout(resolve, delayMs))
        order.push(id * 10)
      })

    // Fire 3 operations simultaneously — they should serialize
    await Promise.all([op(1, 20), op(2, 10), op(3, 5)])

    // Each op should start and finish before the next begins
    expect(order).toEqual([1, 10, 2, 20, 3, 30])
  })

  it('allows parallel operations on different keys', async () => {
    const order: string[] = []

    const op = (key: string, id: string, delayMs: number) =>
      withStorageLock(key, async () => {
        order.push(`${id}-start`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
        order.push(`${id}-end`)
      })

    await Promise.all([op('key-a', 'a', 30), op('key-b', 'b', 10)])

    // b should finish before a since they run in parallel on different keys
    expect(order.indexOf('b-end')).toBeLessThan(order.indexOf('a-end'))
  })

  it('returns the function result', async () => {
    const result = await withStorageLock('test-key', async () => 42)
    expect(result).toBe(42)
  })

  it('propagates errors without blocking subsequent operations', async () => {
    const error = new Error('test error')

    // First operation throws
    await expect(
      withStorageLock('error-key', async () => {
        throw error
      })
    ).rejects.toThrow('test error')

    // Second operation on the same key should still work
    const result = await withStorageLock('error-key', async () => 'ok')
    expect(result).toBe('ok')
  })

  it('handles rapid fire operations correctly', async () => {
    let counter = 0
    const increment = () =>
      withStorageLock('counter-key', async () => {
        const current = counter
        await new Promise(resolve => setTimeout(resolve, 1))
        counter = current + 1
      })

    // Without locking, many of these would read the same value and overwrite each other
    await Promise.all(Array.from({ length: 10 }, () => increment()))

    expect(counter).toBe(10)
  })
})
