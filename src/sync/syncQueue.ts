import type { SyncQueueItem } from '@/types'
import { generateId } from '@/utils/id'

const SYNC_QUEUE_KEY = 'syncQueue'
const MAX_QUEUE_SIZE = 5000

export async function getQueue(): Promise<SyncQueueItem[]> {
  const result = await chrome.storage.local.get(SYNC_QUEUE_KEY)
  return (result[SYNC_QUEUE_KEY] as SyncQueueItem[] | undefined) ?? []
}

export async function enqueue(
  table: SyncQueueItem['table'],
  recordId: string,
  action: SyncQueueItem['action'],
  date?: string
): Promise<void> {
  const queue = await getQueue()

  // Deduplicate: if there's already a pending item for this record,
  // update it instead of adding a duplicate
  const existing = queue.findIndex(item => item.table === table && item.recordId === recordId)
  if (existing !== -1) {
    // For a delete, always override the previous action
    // For an upsert, keep the latest
    queue[existing] = { ...queue[existing], action, updatedAt: Date.now() }
  } else {
    queue.push({
      id: generateId(),
      table,
      recordId,
      action,
      date,
      updatedAt: Date.now(),
    })
  }

  // Enforce queue size limit — drop oldest items if exceeded
  if (queue.length > MAX_QUEUE_SIZE) {
    const overflow = queue.length - MAX_QUEUE_SIZE
    queue.splice(0, overflow)
    console.warn(`[work-timer] Sync queue exceeded ${MAX_QUEUE_SIZE} items, dropped ${overflow} oldest`)
  }

  await chrome.storage.local.set({ [SYNC_QUEUE_KEY]: queue })
}

export async function dequeue(ids: string[]): Promise<void> {
  const queue = await getQueue()
  const remaining = queue.filter(item => !ids.includes(item.id))
  await chrome.storage.local.set({ [SYNC_QUEUE_KEY]: remaining })
}

export async function clearQueue(): Promise<void> {
  await chrome.storage.local.set({ [SYNC_QUEUE_KEY]: [] })
}

export async function getQueueLength(): Promise<number> {
  const queue = await getQueue()
  return queue.length
}
