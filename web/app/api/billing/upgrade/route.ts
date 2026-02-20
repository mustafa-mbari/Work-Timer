import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getStripe, STRIPE_PRICES } from '@/lib/stripe'
import { requireAuthApi } from '@/lib/services/auth'
import { getSubscriptionPlanStatus, getStripeSubscriptionInfo } from '@/lib/repositories/subscriptions'
import { parseBody } from '@/lib/validation'

const upgradeSchema = z.object({
  plan: z.enum(['yearly', 'lifetime']),
})

export async function POST(request: NextRequest) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = parseBody(upgradeSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { plan } = parsed.data
  const priceId = STRIPE_PRICES[plan]
  if (!priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const existing = await getSubscriptionPlanStatus(user.id)
  if (!existing || existing.plan === 'free') {
    return NextResponse.json({ error: 'No active subscription to upgrade' }, { status: 400 })
  }
  if (existing.plan === 'premium_lifetime') {
    return NextResponse.json({ error: 'Already on lifetime plan' }, { status: 400 })
  }
  if (existing.plan === 'premium_yearly' && plan === 'yearly') {
    return NextResponse.json({ error: 'Already on yearly plan' }, { status: 400 })
  }

  const subInfo = await getStripeSubscriptionInfo(user.id)
  const stripeSubId = subInfo?.stripe_subscription_id

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!

  try {
    if (plan === 'yearly' && stripeSubId) {
      // Monthly → Yearly: update Stripe subscription in-place (prorated)
      const stripeSub = await getStripe().subscriptions.retrieve(stripeSubId)
      const itemId = stripeSub.items.data[0]?.id
      if (!itemId) return NextResponse.json({ error: 'Subscription item not found' }, { status: 500 })

      await getStripe().subscriptions.update(stripeSubId, {
        items: [{ id: itemId, price: priceId }],
        proration_behavior: 'create_prorations',
      })

      return NextResponse.json({ success: true, message: 'Upgraded to Yearly' })
    } else {
      // Any → Lifetime: new one-time checkout; existing sub cancelled via webhook after payment
      const session = await getStripe().checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: user.id,
        customer_email: user.email,
        // Reuse existing Stripe customer so payment methods are pre-filled
        ...(subInfo?.stripe_customer_id ? { customer: subInfo.stripe_customer_id } : { customer_email: user.email }),
        success_url: `${siteUrl}/billing?success=true`,
        cancel_url: `${siteUrl}/billing`,
        metadata: {
          userId: user.id,
          plan: 'lifetime',
          cancel_subscription_id: stripeSubId ?? '',
        },
      })

      return NextResponse.json({ url: session.url })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[upgrade] Failed:', { userId: user.id, plan, error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
