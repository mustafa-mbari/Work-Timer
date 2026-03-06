import { describe, it, expect, vi, beforeEach } from 'vitest'
import { seedStore } from '../__tests__/setup'

// Mock auth state
const mockGetCachedSubscription = vi.fn()
vi.mock('@/auth/authState', () => ({
  getCachedSubscription: () => mockGetCachedSubscription(),
}))

// Mock sync dependencies (required by storage imports)
vi.mock('@/sync/syncQueue', () => ({ enqueue: vi.fn() }))
vi.mock('@/sync/syncEngine', () => ({ syncAll: vi.fn() }))

import { getCurrentLimits, getLimits, isPremiumSubscription } from './featureGate'
import { FREE_LIMITS, PREMIUM_LIMITS, GUEST_LIMITS } from '@shared/constants'
import type { SubscriptionInfo } from '@/types'

// --- Fixtures ---

const freeSub: SubscriptionInfo = {
  plan: 'free',
  status: 'active',
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
}

const premiumSub: SubscriptionInfo = {
  plan: 'premium_monthly',
  status: 'active',
  currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  cancelAtPeriodEnd: false,
}

// --- Tests ---

describe('isPremiumSubscription', () => {
  it('returns false for null subscription', () => {
    expect(isPremiumSubscription(null)).toBe(false)
  })

  it('returns false for free plan', () => {
    expect(isPremiumSubscription(freeSub)).toBe(false)
  })

  it('returns true for active premium subscription', () => {
    expect(isPremiumSubscription(premiumSub)).toBe(true)
  })

  it('returns true for trialing subscription', () => {
    expect(isPremiumSubscription({ ...premiumSub, status: 'trialing' })).toBe(true)
  })

  it('returns false for canceled premium subscription', () => {
    expect(isPremiumSubscription({ ...premiumSub, status: 'canceled' })).toBe(false)
  })

  it('returns false for expired premium subscription', () => {
    const expired: SubscriptionInfo = {
      ...premiumSub,
      currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // yesterday
    }
    expect(isPremiumSubscription(expired)).toBe(false)
  })

  it('returns true for premium with null expiry (Stripe-managed)', () => {
    const stripeSub: SubscriptionInfo = {
      ...premiumSub,
      currentPeriodEnd: null,
    }
    expect(isPremiumSubscription(stripeSub)).toBe(true)
  })
})

describe('getLimits', () => {
  it('returns FREE_LIMITS for null subscription', () => {
    expect(getLimits(null)).toBe(FREE_LIMITS)
  })

  it('returns FREE_LIMITS for free plan', () => {
    expect(getLimits(freeSub)).toBe(FREE_LIMITS)
  })

  it('returns PREMIUM_LIMITS for active premium', () => {
    expect(getLimits(premiumSub)).toBe(PREMIUM_LIMITS)
  })
})

describe('getCurrentLimits', () => {
  beforeEach(() => {
    mockGetCachedSubscription.mockReset()
  })

  it('returns GUEST_LIMITS when in guest mode', async () => {
    seedStore({ guestStartedAt: Date.now() })
    mockGetCachedSubscription.mockResolvedValue(null)

    const limits = await getCurrentLimits()
    expect(limits).toBe(GUEST_LIMITS)
    expect(limits.maxProjects).toBe(3)
    expect(limits.maxTags).toBe(3)
    expect(limits.historyDays).toBe(5)
  })

  it('guest mode takes priority over subscription', async () => {
    // Even if there's a premium subscription, guest mode should win
    seedStore({ guestStartedAt: Date.now() })
    mockGetCachedSubscription.mockResolvedValue(premiumSub)

    const limits = await getCurrentLimits()
    expect(limits).toBe(GUEST_LIMITS)
  })

  it('returns FREE_LIMITS when not guest and no subscription', async () => {
    mockGetCachedSubscription.mockResolvedValue(null)

    const limits = await getCurrentLimits()
    expect(limits).toBe(FREE_LIMITS)
  })

  it('returns PREMIUM_LIMITS when not guest and has active premium', async () => {
    mockGetCachedSubscription.mockResolvedValue(premiumSub)

    const limits = await getCurrentLimits()
    expect(limits).toBe(PREMIUM_LIMITS)
  })
})

describe('GUEST_LIMITS values', () => {
  it('has stricter limits than FREE_LIMITS', () => {
    expect(GUEST_LIMITS.maxProjects).toBeLessThan(FREE_LIMITS.maxProjects)
    expect(GUEST_LIMITS.maxTags).toBeLessThan(FREE_LIMITS.maxTags)
    expect(GUEST_LIMITS.historyDays).toBeLessThan(FREE_LIMITS.historyDays)
  })

  it('disallows export and cloud sync', () => {
    expect(GUEST_LIMITS.allowExport).toBe(false)
    expect(GUEST_LIMITS.allowCloudSync).toBe(false)
    expect(GUEST_LIMITS.allowAdvancedStats).toBe(false)
  })
})
