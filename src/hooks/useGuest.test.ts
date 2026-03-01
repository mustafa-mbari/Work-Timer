/**
 * Tests for guest expiry calculation logic.
 *
 * We test the pure computation (not the React hook) by importing the
 * storage helpers and constants directly — the hook just wraps these.
 */
import { describe, it, expect, vi } from 'vitest'
import { seedStore } from '../__tests__/setup'
import { GUEST_SESSION_MAX_MS, GUEST_EXPIRY_WARNING_MS } from '@shared/constants'

// Mock sync dependencies (required by storage imports)
vi.mock('@/sync/syncQueue', () => ({ enqueue: vi.fn() }))
vi.mock('@/sync/syncEngine', () => ({ syncAll: vi.fn() }))
vi.mock('@/auth/authState', () => ({
  getSession: vi.fn().mockResolvedValue(null),
}))
vi.mock('@/premium/featureGate', () => ({
  isCurrentUserPremium: vi.fn().mockResolvedValue(false),
}))

import { getGuestStartedAt, getGuestDaysRemaining, isGuestMode } from '@/storage'

// Reproduce the hook's expiry logic for unit testing
function computeGuestState(startedAt: number | null) {
  if (startedAt === null) {
    return { isGuest: false, daysRemaining: null, isNearExpiry: false, isExpired: false }
  }
  const elapsed = Date.now() - startedAt
  const remainingMs = GUEST_SESSION_MAX_MS - elapsed
  const daysRemaining = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)))
  const isExpired = remainingMs <= 0
  const isNearExpiry = elapsed >= GUEST_EXPIRY_WARNING_MS && !isExpired
  return { isGuest: true, daysRemaining, isNearExpiry, isExpired }
}

describe('Guest expiry computation', () => {
  it('returns not-guest when no guestStartedAt', () => {
    const state = computeGuestState(null)
    expect(state.isGuest).toBe(false)
    expect(state.daysRemaining).toBeNull()
    expect(state.isNearExpiry).toBe(false)
    expect(state.isExpired).toBe(false)
  })

  it('returns 5 days remaining for fresh guest', () => {
    const state = computeGuestState(Date.now())
    expect(state.isGuest).toBe(true)
    expect(state.daysRemaining).toBe(5)
    expect(state.isNearExpiry).toBe(false)
    expect(state.isExpired).toBe(false)
  })

  it('returns correct days after 1 day', () => {
    const oneDayAgo = Date.now() - 1 * 24 * 60 * 60 * 1000
    const state = computeGuestState(oneDayAgo)
    expect(state.daysRemaining).toBe(4)
    expect(state.isNearExpiry).toBe(false)
    expect(state.isExpired).toBe(false)
  })

  it('returns correct days after 2 days', () => {
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000
    const state = computeGuestState(twoDaysAgo)
    expect(state.daysRemaining).toBe(3)
    expect(state.isNearExpiry).toBe(false)
    expect(state.isExpired).toBe(false)
  })

  it('isNearExpiry is true on day 4 (elapsed >= 3 days)', () => {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000
    const state = computeGuestState(threeDaysAgo)
    expect(state.daysRemaining).toBe(2)
    expect(state.isNearExpiry).toBe(true)
    expect(state.isExpired).toBe(false)
  })

  it('isNearExpiry is true on day 5 (elapsed >= 4 days)', () => {
    const fourDaysAgo = Date.now() - 4 * 24 * 60 * 60 * 1000
    const state = computeGuestState(fourDaysAgo)
    expect(state.daysRemaining).toBe(1)
    expect(state.isNearExpiry).toBe(true)
    expect(state.isExpired).toBe(false)
  })

  it('isExpired is true after 5 days', () => {
    const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000 - 1000
    const state = computeGuestState(fiveDaysAgo)
    expect(state.daysRemaining).toBe(0)
    expect(state.isNearExpiry).toBe(false) // isNearExpiry is false when expired
    expect(state.isExpired).toBe(true)
  })

  it('isExpired is true after 10 days', () => {
    const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000
    const state = computeGuestState(tenDaysAgo)
    expect(state.daysRemaining).toBe(0)
    expect(state.isExpired).toBe(true)
  })
})

describe('Guest constants', () => {
  it('GUEST_SESSION_MAX_MS is 5 days', () => {
    expect(GUEST_SESSION_MAX_MS).toBe(5 * 24 * 60 * 60 * 1000)
  })

  it('GUEST_EXPIRY_WARNING_MS is 3 days', () => {
    expect(GUEST_EXPIRY_WARNING_MS).toBe(3 * 24 * 60 * 60 * 1000)
  })

  it('warning starts before expiry', () => {
    expect(GUEST_EXPIRY_WARNING_MS).toBeLessThan(GUEST_SESSION_MAX_MS)
  })
})

describe('Guest storage integration', () => {
  it('getGuestStartedAt returns seeded value', async () => {
    const now = Date.now()
    seedStore({ guestStartedAt: now })
    expect(await getGuestStartedAt()).toBe(now)
  })

  it('isGuestMode returns true when guestStartedAt is set', async () => {
    seedStore({ guestStartedAt: Date.now() })
    expect(await isGuestMode()).toBe(true)
  })

  it('getGuestDaysRemaining returns 4 after 1 day', async () => {
    seedStore({ guestStartedAt: Date.now() - 1 * 24 * 60 * 60 * 1000 })
    expect(await getGuestDaysRemaining()).toBe(4)
  })
})
