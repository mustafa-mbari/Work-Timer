import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

const PLAN_MAP: Record<string, string> = {
  // Populate these with your actual Stripe price IDs after creating products
  [process.env.STRIPE_PRICE_MONTHLY ?? '']: 'premium_monthly',
  [process.env.STRIPE_PRICE_YEARLY ?? '']: 'premium_yearly',
  [process.env.STRIPE_PRICE_LIFETIME ?? '']: 'premium_lifetime',
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[stripe webhook] signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.client_reference_id
      if (!userId) break

      const plan = (session.metadata?.plan ?? 'premium_monthly') as string
      const planName = plan === 'lifetime' ? 'premium_lifetime'
        : plan === 'yearly' ? 'premium_yearly'
        : 'premium_monthly'

      const isLifetime = planName === 'premium_lifetime'

      await (supabase.from('subscriptions') as any).upsert({
        user_id: userId,
        plan: planName,
        status: 'active',
        stripe_customer_id: session.customer as string | null,
        stripe_subscription_id: isLifetime ? null : session.subscription as string | null,
        current_period_end: isLifetime ? null : null, // updated by subscription.updated event
        cancel_at_period_end: false,
        granted_by: 'stripe',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const priceId = sub.items.data[0]?.price.id ?? ''
      const planName = PLAN_MAP[priceId] ?? 'premium_monthly'

      await (supabase.from('subscriptions') as any).update({
        plan: planName,
        status: sub.status,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        cancel_at_period_end: sub.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      }).eq('stripe_subscription_id', sub.id)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await (supabase.from('subscriptions') as any).update({
        plan: 'free',
        status: 'canceled',
        updated_at: new Date().toISOString(),
      }).eq('stripe_subscription_id', sub.id)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      if (invoice.subscription) {
        await (supabase.from('subscriptions') as any).update({
          status: 'past_due',
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', invoice.subscription as string)
      }
      break
    }

    default:
      // Unhandled event type — ignore
      break
  }

  return NextResponse.json({ received: true })
}
