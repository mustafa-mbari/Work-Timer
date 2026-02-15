import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/services/auth'
import { getAllSubscriptionsWithEmail, upsertSubscription } from '@/lib/repositories/subscriptions'
import { findAuthUserByEmail } from '@/lib/repositories/admin'
import { grantPremiumSchema, parseBody } from '@/lib/validation'

export async function GET() {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const subscriptions = await getAllSubscriptionsWithEmail()
  return NextResponse.json({ subscriptions })
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = parseBody(grantPremiumSchema, await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { email, plan, current_period_end } = parsed.data

  // Find user by email via auth.admin (profiles table may be incomplete)
  const authUser = await findAuthUserByEmail(email)

  if (!authUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { error } = await upsertSubscription({
    user_id: authUser.id,
    plan: plan,
    status: 'active',
    granted_by: 'admin_manual',
    ...(current_period_end ? { current_period_end } : {}),
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to grant premium' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
