import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { requireAuthApi } from '@/lib/services/auth'
import { getStripeCustomerId } from '@/lib/repositories/subscriptions'

export async function POST() {
  const user = await requireAuthApi()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stripeCustomerId = await getStripeCustomerId(user.id)

  if (!stripeCustomerId) {
    return NextResponse.json({ error: 'No Stripe customer found' }, { status: 400 })
  }

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!
    const session = await getStripe().billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${siteUrl}/billing`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[billing portal] Failed to create session:', err)
    return NextResponse.json({ error: 'Failed to open billing portal' }, { status: 500 })
  }
}
