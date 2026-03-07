import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'
import { getUserExportRole } from '@/lib/repositories/exportUsage'

// Lazy-init Redis client — only created when env vars are present
let redis: Redis | null = null

function getRedis(): Redis | null {
  if (redis) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  redis = new Redis({ url, token })
  return redis
}

export type PlanTier = 'free' | 'pro' | 'team'

// Plan-based sliding window rate limiters (requests per minute)
const limiterCache = new Map<PlanTier, Ratelimit>()

const TIER_LIMITS: Record<PlanTier, number> = {
  free: 20,
  pro: 60,
  team: 100,
}

function getLimiter(tier: PlanTier): Ratelimit | null {
  const r = getRedis()
  if (!r) return null

  if (!limiterCache.has(tier)) {
    limiterCache.set(tier, new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(TIER_LIMITS[tier], '1 m'),
      prefix: `rl:${tier}`,
    }))
  }
  return limiterCache.get(tier)!
}

/** Map user subscription to a rate limit tier. Reuses the export role RPC. */
export async function getUserTier(userId: string): Promise<PlanTier> {
  try {
    const role = await getUserExportRole(userId)
    if (role === 'team') return 'team'
    if (role === 'pro') return 'pro'
    return 'free'
  } catch {
    return 'free'
  }
}

/**
 * Check if a user is rate-limited. Returns true if limited, false if allowed.
 * Use this in server components where you can't return a NextResponse.
 * Fails open if Redis is unavailable (rate limiting is a soft business rule).
 */
export async function isRateLimited(userId: string, tier: PlanTier): Promise<boolean> {
  try {
    const limiter = getLimiter(tier)
    if (!limiter) return false
    const result = await limiter.limit(userId)
    return !result.success
  } catch {
    return false // fail open
  }
}

/**
 * Check rate limit for a user. Returns null if allowed, or a 429 response if limited.
 * Fails open if Redis is unavailable (rate limiting is a soft business rule).
 */
export async function withRateLimit(
  userId: string,
  tier: PlanTier
): Promise<NextResponse | null> {
  try {
    const limiter = getLimiter(tier)
    if (!limiter) return null // Redis not configured — fail open

    const result = await limiter.limit(userId)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(result.limit),
            'X-RateLimit-Remaining': String(result.remaining),
            'X-RateLimit-Reset': String(result.reset),
            'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)),
          },
        }
      )
    }
    return null
  } catch {
    // Fail open if Redis is unreachable
    return null
  }
}
