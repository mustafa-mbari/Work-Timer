import { NextRequest, NextResponse } from 'next/server'
import { getStripe, STRIPE_PRICES } from '@/lib/stripe'
import { requireAuthApi } from '@/lib/services/auth'
import { getSubscriptionPlanStatus } from '@/lib/repositories/subscriptions'
import { checkoutSchema, parseBody } from '@/lib/validation'

export async function POST(request: NextRequest) {
  const user = await requireAuthApi()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = parseBody(checkoutSchema, await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const plan = parsed.data.plan
  const priceId = STRIPE_PRICES[plan]

  if (!priceId) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  // Check if user already has an active subscription
  const existing = await getSubscriptionPlanStatus(user.id)
  if (existing && existing.plan !== 'free' && existing.status === 'active') {
    return NextResponse.json({ error: 'You already have an active subscription' }, { status: 400 })
  }

  const isLifetime = plan === 'lifetime'
  const isSubscription = !isLifetime // monthly, yearly, allin_monthly, allin_yearly are all subscriptions
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: isSubscription ? 'subscription' : 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      customer_email: user.email,
      success_url: `${siteUrl}/billing?success=true`,
      cancel_url: `${siteUrl}/billing`,
      metadata: { userId: user.id, plan },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[checkout] Failed to create session:', { userId: user.id, plan, error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
