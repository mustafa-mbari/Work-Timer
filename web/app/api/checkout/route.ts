import { NextRequest, NextResponse } from 'next/server'
import { getStripe, STRIPE_PRICES } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import type { PricePlan } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { plan } = await request.json() as { plan: PricePlan }
  const priceId = STRIPE_PRICES[plan]

  if (!priceId) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  // Check if user already has an active subscription
  const { data: existing } = await (supabase
    .from('subscriptions') as any)
    .select('plan, status')
    .eq('user_id', user.id)
    .single()

  if (existing && existing.plan !== 'free' && existing.status === 'active') {
    return NextResponse.json({ error: 'You already have an active subscription' }, { status: 400 })
  }

  const isLifetime = plan === 'lifetime'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: isLifetime ? 'payment' : 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      customer_email: user.email,
      success_url: `${siteUrl}/billing?success=true`,
      cancel_url: `${siteUrl}/billing`,
      metadata: { userId: user.id, plan },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[checkout] Failed to create session:', {
      userId: user.id,
      plan,
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { error: 'Failed to create checkout session. Please try again.' },
      { status: 500 }
    )
  }
}
