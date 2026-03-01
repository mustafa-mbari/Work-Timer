import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { upsertSubscription, updateSubscriptionByStripeId } from '@/lib/repositories/subscriptions'
import { sendEmail, buildBillingNotificationEmail, buildInvoiceReceiptEmail } from '@/lib/email'
import type Stripe from 'stripe'
import type { DbSubscription } from '@/lib/shared/types'

type Plan = DbSubscription['plan']

function buildPlanMap(): Record<string, Plan> {
  const map: Record<string, Plan> = {}
  const monthly = process.env.STRIPE_PRICE_MONTHLY
  const yearly = process.env.STRIPE_PRICE_YEARLY
  const lifetime = process.env.STRIPE_PRICE_LIFETIME
  const allinMonthly = process.env.STRIPE_PRICE_ALLIN_MONTHLY
  const allinYearly = process.env.STRIPE_PRICE_ALLIN_YEARLY
  const team10Monthly = process.env.STRIPE_PRICE_TEAM_10_MONTHLY
  const team10Yearly = process.env.STRIPE_PRICE_TEAM_10_YEARLY
  const team20Monthly = process.env.STRIPE_PRICE_TEAM_20_MONTHLY
  const team20Yearly = process.env.STRIPE_PRICE_TEAM_20_YEARLY
  if (monthly) map[monthly] = 'premium_monthly'
  if (yearly) map[yearly] = 'premium_yearly'
  if (lifetime) map[lifetime] = 'premium_lifetime'
  if (allinMonthly) map[allinMonthly] = 'allin_monthly'
  if (allinYearly) map[allinYearly] = 'allin_yearly'
  if (team10Monthly) map[team10Monthly] = 'team_10_monthly'
  if (team10Yearly) map[team10Yearly] = 'team_10_yearly'
  if (team20Monthly) map[team20Monthly] = 'team_20_monthly'
  if (team20Yearly) map[team20Yearly] = 'team_20_yearly'
  return map
}

const PLAN_MAP = buildPlanMap()

const VALID_PLANS = [
  'premium_monthly', 'premium_yearly', 'premium_lifetime',
  'allin_monthly', 'allin_yearly',
  'team_10_monthly', 'team_10_yearly',
  'team_20_monthly', 'team_20_yearly',
] as const

const PLAN_DISPLAY_NAMES: Record<string, string> = {
  premium_monthly: 'Premium Monthly',
  premium_yearly: 'Premium Yearly',
  premium_lifetime: 'Premium Lifetime',
  allin_monthly: 'All-In Monthly',
  allin_yearly: 'All-In Yearly',
  team_10_monthly: 'Team 10 Monthly',
  team_10_yearly: 'Team 10 Yearly',
  team_20_monthly: 'Team 20 Monthly',
  team_20_yearly: 'Team 20 Yearly',
  free: 'Free',
}

async function getUserEmailAndName(userId: string): Promise<{ email: string | null; displayName: string | null }> {
  try {
    const supabase = await createServiceClient()
    const { data } = await (supabase.from('profiles') as any).select('email, display_name').eq('id', userId).single()
    return { email: (data as any)?.email || null, displayName: (data as any)?.display_name || null }
  } catch {
    return { email: null, displayName: null }
  }
}

function resolveCheckoutPlan(metadata: Record<string, string> | null): Plan | null {
  const plan = metadata?.plan
  if (!plan) return null
  if (plan === 'lifetime') return 'premium_lifetime'
  if (plan === 'yearly') return 'premium_yearly'
  if (plan === 'monthly') return 'premium_monthly'
  if (plan === 'allin_monthly') return 'allin_monthly'
  if (plan === 'allin_yearly') return 'allin_yearly'
  if (plan === 'team_10_monthly') return 'team_10_monthly'
  if (plan === 'team_10_yearly') return 'team_10_yearly'
  if (plan === 'team_20_monthly') return 'team_20_monthly'
  if (plan === 'team_20_yearly') return 'team_20_yearly'
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

        // Send billing notification email
        getUserEmailAndName(userId).then(({ email, displayName }) => {
          if (!email) return
          const { subject, html } = buildBillingNotificationEmail({
            event: 'subscription_created',
            planName: PLAN_DISPLAY_NAMES[planName] || planName,
            displayName,
          })
          sendEmail({ to: email, subject, html, type: 'billing_notification', metadata: { plan: planName } }).catch(() => {})
        })

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

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const customerEmail = invoice.customer_email
        if (customerEmail && invoice.amount_paid > 0) {
          const amount = (invoice.amount_paid / 100).toFixed(2)
          const currency = invoice.currency || 'usd'
          const { subject, html } = buildInvoiceReceiptEmail({
            displayName: invoice.customer_name || null,
            amount,
            currency,
            planName: invoice.lines?.data[0]?.description || 'Work Timer Premium',
            invoiceDate: new Date((invoice.created || 0) * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            invoiceNumber: invoice.number || null,
            invoiceUrl: invoice.hosted_invoice_url || null,
          })
          sendEmail({ to: customerEmail, subject, html, type: 'invoice_receipt' }).catch(() => {})
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
