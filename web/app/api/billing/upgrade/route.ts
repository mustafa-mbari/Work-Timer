import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getStripe, STRIPE_PRICES } from '@/lib/stripe'
import { requireAuthApi } from '@/lib/services/auth'
import { getSubscriptionPlanStatus, getStripeSubscriptionInfo } from '@/lib/repositories/subscriptions'
import { parseBody } from '@/lib/validation'

const upgradeSchema = z.object({
  plan: z.enum(['yearly']),
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
  if (existing.plan === 'premium_yearly' && plan === 'yearly') {
    return NextResponse.json({ error: 'Already on yearly plan' }, { status: 400 })
  }

  const subInfo = await getStripeSubscriptionInfo(user.id)
  const stripeSubId = subInfo?.stripe_subscription_id

  try {
    if (stripeSubId) {
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
      return NextResponse.json({ error: 'No Stripe subscription found' }, { status: 400 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[upgrade] Failed:', { userId: user.id, plan, error: message })
    return NextResponse.json({ error: 'Failed to upgrade plan' }, { status: 500 })
  }
}
