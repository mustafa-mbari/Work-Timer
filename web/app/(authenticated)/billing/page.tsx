import { Check, X, Zap, Star, Infinity as InfinityIcon } from 'lucide-react'
import CheckoutButton from './CheckoutButton'
import UpgradeButton from './UpgradeButton'
import PortalButton from './PortalButton'
import PromoCodeInput from './PromoCodeInput'
import { PRICING } from '@/lib/shared/constants'
import { requireAuth } from '@/lib/services/auth'
import { getUserSubscriptionForBilling } from '@/lib/repositories/subscriptions'

const FREE_FEATURES = [
  { text: 'Up to 5 projects', included: true },
  { text: '30-day history', included: true },
  { text: 'Local storage only', included: true },
  { text: 'Cloud sync', included: false },
  { text: 'Data export', included: false },
  { text: 'Advanced analytics', included: false },
]

const PREMIUM_FEATURES = [
  'Unlimited projects',
  'Full history (unlimited)',
  'Cloud sync across devices',
  'CSV & Excel export',
  'Advanced analytics',
  'Priority support',
]

const PAID_PLANS = [
  {
    id: 'monthly' as const,
    planKey: 'premium_monthly',
    name: 'Monthly',
    price: PRICING.monthly,
    per: '/mo',
    badge: null as string | null,
    description: 'Cancel anytime',
    highlight: false,
  },
  {
    id: 'yearly' as const,
    planKey: 'premium_yearly',
    name: 'Yearly',
    price: PRICING.yearly,
    per: '/yr',
    badge: 'Best Value' as string | null,
    description: 'Save 58% vs monthly',
    highlight: true,
  },
  {
    id: 'lifetime' as const,
    planKey: 'premium_lifetime',
    name: 'Lifetime',
    price: PRICING.lifetime,
    per: ' once',
    badge: null as string | null,
    description: 'Pay once, use forever',
    highlight: false,
  },
]

export default async function BillingPage() {
  const user = await requireAuth()
  const { data: subscription } = await getUserSubscriptionForBilling(user.id)

  const currentPlan = subscription?.plan ?? 'free'
  const isPremium = currentPlan !== 'free'
  const isLifetime = currentPlan === 'premium_lifetime'

  const renewalInfo = (() => {
    if (!isPremium || isLifetime) return null
    if (!subscription?.current_period_end) return null
    const date = new Date(subscription.current_period_end).toLocaleDateString()
    return subscription.cancel_at_period_end ? `Cancels ${date}` : `Renews ${date}`
  })()

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Billing</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Manage your subscription and payment
        </p>
      </div>

      {/* Active plan banner — premium only */}
      {isPremium && (
        <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 p-5 text-white flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Zap className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold uppercase tracking-widest text-indigo-200">Active Plan</span>
            </div>
            <p className="font-bold text-lg leading-tight">
              {currentPlan === 'premium_monthly' && 'Premium Monthly'}
              {currentPlan === 'premium_yearly' && 'Premium Yearly'}
              {currentPlan === 'premium_lifetime' && 'Premium Lifetime'}
            </p>
            {renewalInfo && (
              <p className="text-sm text-indigo-200 mt-0.5">{renewalInfo}</p>
            )}
            {isLifetime && (
              <p className="text-sm text-indigo-200 mt-0.5">Lifetime access · No renewals</p>
            )}
          </div>
          {!isLifetime && subscription?.stripe_customer_id && <PortalButton />}
        </div>
      )}

      {/* Plan cards — always shown */}
      <div>
        <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-1">
          {isPremium ? 'Your plan overview' : 'Choose a plan'}
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-5">
          {isPremium
            ? 'All premium features are active on your account.'
            : 'Upgrade to unlock cloud sync, unlimited projects, analytics, and more.'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">

          {/* Free plan card */}
          <div className={`relative rounded-2xl border-2 p-6 flex flex-col ${
            currentPlan === 'free'
              ? 'border-indigo-400 dark:border-indigo-500 bg-white dark:bg-[var(--dark-card)]'
              : 'border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] opacity-60'
          }`}>
            {currentPlan === 'free' && (
              <div className="absolute -top-3 left-4">
                <span className="inline-flex items-center bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Current Plan
                </span>
              </div>
            )}
            <div className="mb-5 pt-1">
              <p className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">Free</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-stone-900 dark:text-stone-100">$0</span>
                <span className="text-sm text-stone-400 dark:text-stone-500 mb-1">/mo</span>
              </div>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">No credit card required</p>
            </div>
            <ul className="space-y-2.5 flex-1">
              {FREE_FEATURES.map(f => (
                <li key={f.text} className="flex items-start gap-2 text-sm">
                  {f.included
                    ? <Check className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />
                    : <X className="h-4 w-4 mt-0.5 shrink-0 text-stone-300 dark:text-stone-600" />
                  }
                  <span className={f.included ? 'text-stone-600 dark:text-stone-400' : 'text-stone-400 dark:text-stone-600 line-through'}>
                    {f.text}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6 py-2.5 px-4 rounded-xl text-sm font-semibold text-center text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-[var(--dark-elevated)]">
              {currentPlan === 'free' ? 'Your current plan' : 'Free tier'}
            </div>
          </div>

          {/* Paid plan cards */}
          {PAID_PLANS.map(plan => {
            const isActive = currentPlan === plan.planKey
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-6 flex flex-col ${
                  isActive
                    ? 'border-2 border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20'
                    : plan.highlight && !isPremium
                      ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 shadow-md shadow-indigo-50 dark:shadow-indigo-900/10'
                      : 'border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)]'
                }`}
              >
                {/* Badge */}
                {isActive ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Current Plan
                    </span>
                  </div>
                ) : plan.badge && !isPremium ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      <Star className="h-3 w-3" />
                      {plan.badge}
                    </span>
                  </div>
                ) : null}

                <div className="mb-5">
                  <p className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
                    {plan.name}
                  </p>
                  <div className="flex items-end gap-0.5">
                    <span className="text-4xl font-bold text-stone-900 dark:text-stone-100">${plan.price}</span>
                    <span className="text-sm text-stone-400 dark:text-stone-500 mb-1">{plan.per}</span>
                  </div>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">{plan.description}</p>
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {PREMIUM_FEATURES.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-stone-600 dark:text-stone-400">
                      <Check className={`h-4 w-4 mt-0.5 shrink-0 ${isActive || plan.highlight ? 'text-indigo-500' : 'text-emerald-500'}`} />
                      {f}
                    </li>
                  ))}
                  {plan.id === 'lifetime' && (
                    <li className="flex items-start gap-2 text-sm text-stone-600 dark:text-stone-400">
                      <InfinityIcon className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />
                      No recurring charges
                    </li>
                  )}
                </ul>

                {isActive ? (
                  <div className="py-2.5 px-4 rounded-xl text-sm font-semibold text-center text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30">
                    Active
                  </div>
                ) : !isPremium ? (
                  <CheckoutButton plan={plan.id} label={`Get ${plan.name}`} highlight={plan.highlight} />
                ) : currentPlan === 'premium_monthly' && plan.id === 'yearly' ? (
                  <UpgradeButton plan="yearly" label="Upgrade to Yearly" />
                ) : (currentPlan === 'premium_monthly' || currentPlan === 'premium_yearly') && plan.id === 'lifetime' ? (
                  <UpgradeButton plan="lifetime" label="Upgrade to Lifetime" />
                ) : (
                  <div className="py-2.5 px-4 rounded-xl text-sm font-semibold text-center text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-[var(--dark-elevated)]">
                    Not available
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Promo code */}
      {!isLifetime && (
        <div className="rounded-2xl border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] p-6">
          <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200 mb-1">Have a promo code?</h3>
          <p className="text-xs text-stone-400 dark:text-stone-500 mb-4">Enter your code to get a discount or free access.</p>
          <PromoCodeInput />
        </div>
      )}
    </div>
  )
}
