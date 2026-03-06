import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/services/auth'
import { getAllSubscriptionsWithEmail, upsertSubscription } from '@/lib/repositories/subscriptions'
import { findAuthUserByEmail } from '@/lib/repositories/admin'
import { grantPremiumSchema, parseBody } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)))

  const result = await getAllSubscriptionsWithEmail(page, pageSize)
  return NextResponse.json({ subscriptions: result.data, total: result.total, page: result.page, pageSize: result.pageSize })
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = parseBody(grantPremiumSchema, await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { email, plan, current_period_end } = parsed.data

  const authUser = await findAuthUserByEmail(email)

  if (!authUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { error } = await upsertSubscription({
    user_id: authUser.id,
    plan: plan,
    status: 'active',
    granted_by: 'admin_manual',
    stripe_subscription_id: null,
    stripe_customer_id: null,
    cancel_at_period_end: false,
    current_period_end: current_period_end ?? null,
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to grant premium' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
