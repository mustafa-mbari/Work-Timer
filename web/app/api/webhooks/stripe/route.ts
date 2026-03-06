import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { upsertSubscription, updateSubscriptionByStripeId } from '@/lib/repositories/subscriptions'
import { sendEmail, buildBillingNotificationEmail, buildInvoiceReceiptEmail, buildTrialEndingEmail } from '@/lib/email'
import type Stripe from 'stripe'
import type { DbSubscription } from '@/lib/shared/types'

type Plan = DbSubscription['plan']

function buildPlanMap(): Record<string, Plan> {
  const map: Record<string, Plan> = {}
  const monthly = process.env.STRIPE_PRICE_MONTHLY
  const yearly = process.env.STRIPE_PRICE_YEARLY
  const allinMonthly = process.env.STRIPE_PRICE_ALLIN_MONTHLY
  const allinYearly = process.env.STRIPE_PRICE_ALLIN_YEARLY
  const team10Monthly = process.env.STRIPE_PRICE_TEAM_10_MONTHLY
  const team10Yearly = process.env.STRIPE_PRICE_TEAM_10_YEARLY
  const team20Monthly = process.env.STRIPE_PRICE_TEAM_20_MONTHLY
  const team20Yearly = process.env.STRIPE_PRICE_TEAM_20_YEARLY
  if (monthly) map[monthly] = 'premium_monthly'
  if (yearly) map[yearly] = 'premium_yearly'
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
  'premium_monthly', 'premium_yearly',
  'allin_monthly', 'allin_yearly',
  'team_10_monthly', 'team_10_yearly',
  'team_20_monthly', 'team_20_yearly',
] as const

const PLAN_DISPLAY_NAMES: Record<string, string> = {
  premium_monthly: 'Premium Monthly',
  premium_yearly: 'Premium Yearly',
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
    const { data } = await supabase
      .from('profiles')
      .select('email, display_name')
      .eq('id', userId)
      .single<{ email: string; display_name: string | null }>()
    
    return { 
      email: data?.email || null, 
      displayName: data?.display_name || null 
    }
  } catch (err) {
    console.error('[stripe webhook] Error fetching user profile:', err)
    return { email: null, displayName: null }
  }
}

function resolveCheckoutPlan(metadata: Record<string, string> | null): Plan | null {
  const plan = metadata?.plan
  if (!plan) return null
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

/** Try to claim an event for processing via INSERT.
 *  Returns true if claimed (we should process it), false if duplicate. */
async function claimEvent(eventId: string, eventType: string): Promise<boolean> {
  try {
    const supabase = await createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('stripe_events') as any)
      .insert({ event_id: eventId, event_type: eventType })
    if (error) {
      // Unique constraint violation = already claimed by another request
      if (error.code === '23505') return false
      console.warn('[stripe webhook] idempotency claim error:', error)
      return true // fail open
    }
    return true
  } catch {
    return true // fail open
  }
}

/** Release a claimed event so Stripe can retry delivery on processing failure. */
async function releaseEvent(eventId: string): Promise<void> {
  try {
    const supabase = await createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('stripe_events') as any)
      .delete()
      .eq('event_id', eventId)
  } catch (err) {
    console.warn('[stripe webhook] failed to release event:', err)
  }
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

  // Idempotency: claim event via INSERT (atomic — prevents race conditions)
  if (!await claimEvent(event.id, event.type)) {
    return NextResponse.json({ received: true, duplicate: true })
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

        const { error } = await upsertSubscription({
          user_id: userId,
          plan: planName,
          status: 'active',
          stripe_customer_id: session.customer as string | null,
          stripe_subscription_id: session.subscription as string | null,
          current_period_end: null,
          cancel_at_period_end: false,
          granted_by: 'stripe',
        })

        if (error) {
          console.error('[stripe webhook] checkout upsert failed:', error)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        // Send billing notification email
        try {
          const { email, displayName } = await getUserEmailAndName(userId)
          if (email) {
            const { subject, html } = buildBillingNotificationEmail({
              event: 'subscription_created',
              planName: PLAN_DISPLAY_NAMES[planName] || planName,
              displayName,
            })
            await sendEmail({ to: email, subject, html, type: 'billing_notification', metadata: { plan: planName } })
          }
        } catch (emailErr) {
          console.error('[stripe webhook] checkout email failed:', emailErr)
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
        const priceIdDel = sub.items.data[0]?.price.id ?? ''
        const cancelledPlan = PLAN_MAP[priceIdDel]

        const { error } = await updateSubscriptionByStripeId(sub.id, {
          plan: 'free',
          status: 'canceled',
        })

        if (error) {
          console.error('[stripe webhook] subscription delete failed:', error)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        // Send cancellation notification email
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
        if (customerId) {
          try {
            const customer = await getStripe().customers.retrieve(customerId)
            if (!customer.deleted && 'email' in customer && customer.email) {
              const { subject, html } = buildBillingNotificationEmail({
                event: 'subscription_cancelled',
                planName: PLAN_DISPLAY_NAMES[cancelledPlan || 'free'] || 'Premium',
                displayName: customer.name || null,
              })
              await sendEmail({ to: customer.email, subject, html, type: 'billing_notification', metadata: { plan: cancelledPlan || 'free' } })
            }
          } catch (emailErr) {
            console.error('[stripe webhook] cancellation email failed:', emailErr)
          }
        }
        break
      }

      case 'customer.subscription.trial_will_end': {
        const sub = event.data.object as Stripe.Subscription
        const trialEnd = sub.trial_end
        if (!trialEnd) break

        const daysRemaining = Math.max(0, Math.ceil((trialEnd * 1000 - Date.now()) / (24 * 60 * 60 * 1000)))
        const trialEndDate = new Date(trialEnd * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
        if (customerId) {
          try {
            const customer = await getStripe().customers.retrieve(customerId)
            if (!customer.deleted && 'email' in customer && customer.email) {
              const { subject, html } = buildTrialEndingEmail({
                displayName: customer.name || null,
                daysRemaining,
                trialEndDate,
              })
              await sendEmail({ to: customer.email, subject, html, type: 'trial_ending' })
            }
          } catch (emailErr) {
            console.error('[stripe webhook] trial ending email failed:', emailErr)
          }
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
          try {
            await sendEmail({ to: customerEmail, subject, html, type: 'invoice_receipt' })
          } catch (emailErr) {
            console.error('[stripe webhook] invoice receipt email failed:', emailErr)
          }
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
    // Release the idempotency claim so Stripe can retry
    await releaseEvent(event.id)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
