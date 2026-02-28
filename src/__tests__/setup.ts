/**
 * Vitest setup: mock chrome.storage.local API
 *
 * Provides an in-memory implementation of chrome.storage.local
 * that behaves like the real Chrome storage API.
 */
import { vi, beforeEach } from 'vitest'

let store: Record<string, unknown> = {}
const changeListeners: Array<(changes: Record<string, { oldValue?: unknown; newValue?: unknown }>, areaName: string) => void> = []

const storageMock = {
  local: {
    get: vi.fn(async (keys: string | string[] | null) => {
      if (keys === null) return { ...store }
      const keyArr = typeof keys === 'string' ? [keys] : keys
      const result: Record<string, unknown> = {}
      for (const k of keyArr) {
        if (k in store) result[k] = store[k]
      }
      return result
    }),
    set: vi.fn(async (data: Record<string, unknown>) => {
      const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {}
      for (const [key, value] of Object.entries(data)) {
        changes[key] = { oldValue: store[key], newValue: value }
        store[key] = value
      }
      for (const listener of changeListeners) {
        listener(changes, 'local')
      }
    }),
    remove: vi.fn(async (keys: string | string[]) => {
      const keyArr = typeof keys === 'string' ? [keys] : keys
      for (const k of keyArr) {
        delete store[k]
      }
    }),
    getBytesInUse: vi.fn(async () => {
      return JSON.stringify(store).length
    }),
  },
  onChanged: {
    addListener: vi.fn((fn: (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>, areaName: string) => void) => {
      changeListeners.push(fn)
    }),
    removeListener: vi.fn(),
  },
}

// Install mock globally
;(globalThis as Record<string, unknown>).chrome = {
  storage: storageMock,
}

// Mock `self` (service worker global) for storageSet quota event dispatch
;(globalThis as Record<string, unknown>).self = {
  dispatchEvent: vi.fn(),
}

// Helper: get raw store contents (for assertions)
export function getStore(): Record<string, unknown> {
  return store
}

// Helper: pre-seed the store
export function seedStore(data: Record<string, unknown>): void {
  Object.assign(store, data)
}

// Reset between tests
beforeEach(() => {
  store = {}
  changeListeners.length = 0
  vi.clearAllMocks()
})
