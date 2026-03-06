/**
 * Per-key async mutex for serializing chrome.storage read-modify-write operations.
 * Each unique key gets its own promise chain so unrelated keys don't block each other.
 */

const locks = new Map<string, Promise<void>>()

export async function withStorageLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  // Chain this operation behind any pending operation on the same key
  const prev = locks.get(key) ?? Promise.resolve()

  let releaseLock!: () => void
  const lock = new Promise<void>(resolve => {
    releaseLock = resolve
  })
  locks.set(key, lock)

  // Wait for the previous operation to finish (regardless of success/failure)
  await prev.catch(() => {})

  try {
    return await fn()
  } finally {
    // Clean up if this is still the latest lock for this key
    if (locks.get(key) === lock) {
      locks.delete(key)
    }
    releaseLock()
  }
}
