import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

function buildPlanMap(): Record<string, string> {
  const map: Record<string, string> = {}
  const monthly = process.env.STRIPE_PRICE_MONTHLY
  const yearly = process.env.STRIPE_PRICE_YEARLY
  const lifetime = process.env.STRIPE_PRICE_LIFETIME
  if (monthly) map[monthly] = 'premium_monthly'
  if (yearly) map[yearly] = 'premium_yearly'
  if (lifetime) map[lifetime] = 'premium_lifetime'
  return map
}

const PLAN_MAP = buildPlanMap()

const VALID_PLANS = ['premium_monthly', 'premium_yearly', 'premium_lifetime'] as const

function resolveCheckoutPlan(metadata: Record<string, string> | null): string | null {
  const plan = metadata?.plan
  if (!plan) return null
  if (plan === 'lifetime') return 'premium_lifetime'
  if (plan === 'yearly') return 'premium_yearly'
  if (plan === 'monthly') return 'premium_monthly'
  // Direct plan name (e.g. 'premium_monthly')
  if (VALID_PLANS.includes(plan as any)) return plan
  return null
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

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id
        if (!userId) {
          console.error('[stripe webhook] checkout.session.completed: no client_reference_id')
          break
        }

        const planName = resolveCheckoutPlan(session.metadata as Record<string, string> | null)
        if (!planName) {
          console.error('[stripe webhook] checkout.session.completed: unresolvable plan from metadata:', session.metadata)
          break
        }

        const isLifetime = planName === 'premium_lifetime'

        const { error } = await (supabase.from('subscriptions') as any).upsert({
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

        if (error) {
          console.error('[stripe webhook] checkout upsert failed:', error)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const priceId = sub.items.data[0]?.price.id ?? ''
        const planName = PLAN_MAP[priceId]

        if (!planName) {
          console.error('[stripe webhook] subscription.updated: unknown price ID:', priceId, 'Known prices:', Object.keys(PLAN_MAP))
          break
        }

        const { error } = await (supabase.from('subscriptions') as any).update({
          plan: planName,
          status: sub.status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', sub.id)

        if (error) {
          console.error('[stripe webhook] subscription update failed:', error)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const { error } = await (supabase.from('subscriptions') as any).update({
          plan: 'free',
          status: 'canceled',
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', sub.id)

        if (error) {
          console.error('[stripe webhook] subscription delete failed:', error)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          const { error } = await (supabase.from('subscriptions') as any).update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          }).eq('stripe_subscription_id', invoice.subscription as string)

          if (error) {
            console.error('[stripe webhook] payment_failed update failed:', error)
          }
        }
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error('[stripe webhook] handler error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
