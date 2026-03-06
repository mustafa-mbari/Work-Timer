/**
 * Simple in-memory rate limiter for API routes.
 * Tracks request timestamps per key (typically IP address).
 * Not shared across serverless instances — provides best-effort protection.
 */

const store = new Map<string, number[]>()

// Clean up stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup(windowMs: number) {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  const cutoff = now - windowMs
  for (const [key, timestamps] of store) {
    const valid = timestamps.filter(t => t > cutoff)
    if (valid.length === 0) {
      store.delete(key)
    } else {
      store.set(key, valid)
    }
  }
}

/**
 * Check if a request should be rate-limited.
 * @param key - Unique identifier (e.g., IP address)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds (default: 60s)
 * @returns true if the request is allowed, false if rate-limited
 */
export function checkRateLimit(key: string, maxRequests: number, windowMs: number = 60_000): boolean {
  cleanup(windowMs)

  const now = Date.now()
  const cutoff = now - windowMs
  const timestamps = store.get(key) ?? []
  const valid = timestamps.filter(t => t > cutoff)

  if (valid.length >= maxRequests) {
    return false
  }

  valid.push(now)
  store.set(key, valid)
  return true
}
