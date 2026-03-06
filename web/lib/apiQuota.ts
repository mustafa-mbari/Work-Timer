import { NextResponse } from 'next/server'
import { checkApiQuota } from '@/lib/repositories/apiQuota'
import type { ApiResourceType } from '@/lib/shared/types'

/**
 * Middleware helper: check monthly API quota for a mutation.
 * Returns a 429 NextResponse if quota exceeded, or null if allowed.
 * Fails open on errors (returns null = allowed).
 */
export async function withApiQuota(
  userId: string,
  resourceType: ApiResourceType,
): Promise<NextResponse | null> {
  try {
    const result = await checkApiQuota(userId, resourceType)

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'Monthly API quota exceeded',
          resource: resourceType,
          used: result.used,
          limit: result.limit,
          remaining: 0,
        },
        {
          status: 429,
          headers: {
            'X-Quota-Limit': String(result.limit),
            'X-Quota-Used': String(result.used),
            'X-Quota-Remaining': '0',
            'X-Quota-Resource': resourceType,
          },
        },
      )
    }

    return null
  } catch (err) {
    console.error('[withApiQuota] Unexpected error:', err)
    // Fail open
    return null
  }
}
