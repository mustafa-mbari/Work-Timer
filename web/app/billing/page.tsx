import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CheckoutButton from './CheckoutButton'
import { PRICING } from '@shared/constants'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: subscription } = await (supabase
    .from('subscriptions') as any)
    .select('*')
    .eq('user_id', user.id)
    .single()

  const isPremium = subscription && subscription.plan !== 'free'
  const isLifetime = subscription?.plan === 'premium_lifetime'

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-stone-900 mb-8">Billing</h1>

      {/* Current plan */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 mb-6">
        <h2 className="font-semibold text-stone-900 mb-4">Current Plan</h2>

        {subscription?.plan === 'free' && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg font-semibold text-stone-900">Free</span>
              <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">Forever</span>
            </div>
            <p className="text-sm text-stone-600 mb-4">
              Up to 5 projects · 30-day history · Local storage only
            </p>
          </div>
        )}

        {subscription?.plan === 'premium_monthly' && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg font-semibold text-stone-900">Premium Monthly</span>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Active</span>
            </div>
            <p className="text-sm text-stone-600 mb-1">${PRICING.monthly}/month</p>
            {subscription.current_period_end && (
              <p className="text-xs text-stone-500">
                {subscription.cancel_at_period_end
                  ? `Cancels on ${new Date(subscription.current_period_end).toLocaleDateString()}`
                  : `Renews on ${new Date(subscription.current_period_end).toLocaleDateString()}`
                }
              </p>
            )}
          </div>
        )}

        {subscription?.plan === 'premium_yearly' && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg font-semibold text-stone-900">Premium Yearly</span>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Active</span>
            </div>
            <p className="text-sm text-stone-600 mb-1">${PRICING.yearly}/year</p>
            {subscription.current_period_end && (
              <p className="text-xs text-stone-500">
                {subscription.cancel_at_period_end
                  ? `Cancels on ${new Date(subscription.current_period_end).toLocaleDateString()}`
                  : `Renews on ${new Date(subscription.current_period_end).toLocaleDateString()}`
                }
              </p>
            )}
          </div>
        )}

        {subscription?.plan === 'premium_lifetime' && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg font-semibold text-stone-900">Premium Lifetime</span>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Active</span>
            </div>
            <p className="text-sm text-stone-600">One-time payment · No renewals · You own this forever</p>
          </div>
        )}
      </div>

      {/* Upgrade options (if free or wants to change plan) */}
      {!isPremium && (
        <div className="rounded-2xl border border-stone-200 bg-white p-6 mb-6">
          <h2 className="font-semibold text-stone-900 mb-4">Upgrade to Premium</h2>
          <div className="space-y-3">
            <CheckoutButton plan="monthly" label={`Monthly — $${PRICING.monthly}/mo`} />
            <CheckoutButton plan="yearly" label={`Yearly — $${PRICING.yearly}/yr (Best value)`} />
            <CheckoutButton plan="lifetime" label={`Lifetime — $${PRICING.lifetime} one-time`} />
          </div>
        </div>
      )}

      {/* Manage subscription */}
      {isPremium && !isLifetime && subscription?.stripe_customer_id && (
        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="font-semibold text-stone-900 mb-2">Manage Subscription</h2>
          <p className="text-sm text-stone-500 mb-4">
            Update payment method, view invoices, or cancel your subscription.
          </p>
          <form action={`https://billing.stripe.com/p/login/test_${subscription.stripe_customer_id}`} method="POST">
            <button
              type="submit"
              className="px-4 py-2 border border-stone-200 hover:bg-stone-50 text-stone-700 text-sm font-medium rounded-lg transition-colors"
            >
              Open Stripe Portal
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
