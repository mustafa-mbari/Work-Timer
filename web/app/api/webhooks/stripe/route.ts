import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { upsertSubscription, updateSubscriptionByStripeId } from '@/lib/repositories/subscriptions'
import type Stripe from 'stripe'
import type { DbSubscription } from '@/lib/shared/types'

type Plan = DbSubscription['plan']

function buildPlanMap(): Record<string, Plan> {
  const map: Record<string, Plan> = {}
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

function resolveCheckoutPlan(metadata: Record<string, string> | null): Plan | null {
  const plan = metadata?.plan
  if (!plan) return null
  if (plan === 'lifetime') return 'premium_lifetime'
  if (plan === 'yearly') return 'premium_yearly'
  if (plan === 'monthly') return 'premium_monthly'
  if (VALID_PLANS.includes(plan as typeof VALID_PLANS[number])) return plan as Plan
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

  // Idempotency check: attempt insert first (unique constraint on event_id)
  try {
    const supabase = await createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase.from('stripe_events') as any)
      .insert({ event_id: event.id, event_type: event.type })
    if (insertError) {
      // Unique constraint violation = duplicate event, skip processing
      if (insertError.code === '23505') {
        return NextResponse.json({ received: true, duplicate: true })
      }
      console.warn('[stripe webhook] idempotency insert failed:', insertError)
    }
  } catch (err) {
    // Log but don't fail — idempotency is best-effort until table exists
    console.warn('[stripe webhook] idempotency check failed:', err)
  }

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

        const { error } = await upsertSubscription({
          user_id: userId,
          plan: planName,
          status: 'active',
          stripe_customer_id: session.customer as string | null,
          stripe_subscription_id: isLifetime ? null : session.subscription as string | null,
          current_period_end: null,
          cancel_at_period_end: false,
          granted_by: 'stripe',
        })

        if (error) {
          console.error('[stripe webhook] checkout upsert failed:', error)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        // If this was a lifetime upgrade from an existing subscription, cancel the old sub
        if (isLifetime) {
          const cancelSubId = (session.metadata as Record<string, string> | null)?.cancel_subscription_id
          if (cancelSubId) {
            await getStripe().subscriptions.cancel(cancelSubId).catch(e => {
              console.warn('[stripe webhook] failed to cancel old sub during lifetime upgrade:', e)
            })
          }
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

        const { error } = await updateSubscriptionByStripeId(sub.id, {
          plan: planName,
          status: sub.status as DbSubscription['status'],
          current_period_end: sub.items.data[0]?.current_period_end
            ? new Date(sub.items.data[0].current_period_end * 1000).toISOString()
            : null,
          cancel_at_period_end: sub.cancel_at_period_end,
        })

        if (error) {
          console.error('[stripe webhook] subscription update failed:', error)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const { error } = await updateSubscriptionByStripeId(sub.id, {
          plan: 'free',
          status: 'canceled',
        })

        if (error) {
          console.error('[stripe webhook] subscription delete failed:', error)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subDetail = invoice.parent?.subscription_details?.subscription
        const stripeSubId = typeof subDetail === 'string' ? subDetail : subDetail?.id
        if (stripeSubId) {
          const { error } = await updateSubscriptionByStripeId(stripeSubId, {
            status: 'past_due',
          })

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
