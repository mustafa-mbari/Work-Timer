import { describe, it, expect, vi, beforeEach } from 'vitest'
import { seedStore, getStore } from '../__tests__/setup'

// Mock nanoid for deterministic IDs
let idCounter = 0
vi.mock('@/utils/id', () => ({
  generateId: () => `id-${++idCounter}`,
}))

import { getQueue, enqueue, dequeue, clearQueue, getQueueLength } from './syncQueue'

beforeEach(() => {
  idCounter = 0
})

describe('Sync Queue', () => {
  it('starts with empty queue', async () => {
    expect(await getQueue()).toEqual([])
    expect(await getQueueLength()).toBe(0)
  })

  it('enqueues a single item', async () => {
    await enqueue('time_entries', 'rec-1', 'upsert', '2025-01-15')
    const queue = await getQueue()
    expect(queue).toHaveLength(1)
    expect(queue[0]).toMatchObject({
      id: 'id-1',
      table: 'time_entries',
      recordId: 'rec-1',
      action: 'upsert',
      date: '2025-01-15',
    })
    expect(queue[0].updatedAt).toBeGreaterThan(0)
  })

  it('enqueues multiple items', async () => {
    await enqueue('time_entries', 'rec-1', 'upsert')
    await enqueue('projects', 'proj-1', 'upsert')
    await enqueue('tags', 'tag-1', 'upsert')
    expect(await getQueueLength()).toBe(3)
  })

  it('deduplicates by table + recordId', async () => {
    await enqueue('time_entries', 'rec-1', 'upsert')
    await enqueue('time_entries', 'rec-1', 'upsert') // same record
    const queue = await getQueue()
    expect(queue).toHaveLength(1)
    // The id should be the original, but updatedAt should be refreshed
    expect(queue[0].id).toBe('id-1')
  })

  it('delete overrides previous upsert for same record', async () => {
    await enqueue('projects', 'proj-1', 'upsert')
    await enqueue('projects', 'proj-1', 'delete')
    const queue = await getQueue()
    expect(queue).toHaveLength(1)
    expect(queue[0].action).toBe('delete')
  })

  it('upsert overrides previous delete for same record', async () => {
    await enqueue('projects', 'proj-1', 'delete')
    await enqueue('projects', 'proj-1', 'upsert')
    const queue = await getQueue()
    expect(queue).toHaveLength(1)
    expect(queue[0].action).toBe('upsert')
  })

  it('does not deduplicate across different tables', async () => {
    await enqueue('time_entries', 'id-shared', 'upsert')
    await enqueue('projects', 'id-shared', 'upsert')
    expect(await getQueueLength()).toBe(2)
  })

  it('does not deduplicate across different record IDs', async () => {
    await enqueue('time_entries', 'rec-1', 'upsert')
    await enqueue('time_entries', 'rec-2', 'upsert')
    expect(await getQueueLength()).toBe(2)
  })

  it('dequeues by ID', async () => {
    await enqueue('time_entries', 'rec-1', 'upsert')
    await enqueue('projects', 'proj-1', 'upsert')
    const queue = await getQueue()
    await dequeue([queue[0].id])
    const remaining = await getQueue()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].table).toBe('projects')
  })

  it('dequeue with non-existent ID does nothing', async () => {
    await enqueue('time_entries', 'rec-1', 'upsert')
    await dequeue(['non-existent'])
    expect(await getQueueLength()).toBe(1)
  })

  it('clears entire queue', async () => {
    await enqueue('time_entries', 'rec-1', 'upsert')
    await enqueue('projects', 'proj-1', 'upsert')
    await clearQueue()
    expect(await getQueueLength()).toBe(0)
  })

  it('enforces max queue size (5000)', async () => {
    // Pre-seed a queue at the limit
    const items = Array.from({ length: 5000 }, (_, i) => ({
      id: `existing-${i}`,
      table: 'time_entries' as const,
      recordId: `rec-${i}`,
      action: 'upsert' as const,
      updatedAt: Date.now(),
    }))
    seedStore({ syncQueue: items })

    // Adding one more should drop the oldest
    await enqueue('projects', 'new-proj', 'upsert')
    const queue = await getQueue()
    expect(queue).toHaveLength(5000)
    // The newest item should be at the end
    expect(queue[queue.length - 1].recordId).toBe('new-proj')
    // The first item should NOT be existing-0 (it was dropped)
    expect(queue[0].recordId).toBe('rec-1')
  })

  it('persists queue to chrome.storage.local', async () => {
    await enqueue('tags', 'tag-1', 'upsert')
    const store = getStore()
    const raw = store['syncQueue'] as unknown[]
    expect(raw).toHaveLength(1)
  })
})
