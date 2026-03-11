import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/services/auth'
import { upsertSubscription } from '@/lib/repositories/subscriptions'
import { grantUserSubscriptionSchema, parseBody } from '@/lib/validation'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const parsed = parseBody(grantUserSubscriptionSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { plan, status, current_period_end } = parsed.data

  const { error } = await upsertSubscription({
    user_id: id,
    plan,
    status,
    granted_by: 'admin_manual',
    stripe_subscription_id: null,
    stripe_customer_id: null,
    cancel_at_period_end: false,
    current_period_end: current_period_end ?? null,
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
