import { Check, X, Zap, Star, Infinity as InfinityIcon } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('billing')
  return { title: t('title') }
}
import CheckoutButton from './CheckoutButton'
import UpgradeButton from './UpgradeButton'
import PortalButton from './PortalButton'
import PromoCodeInput from './PromoCodeInput'
import { PRICING } from '@/lib/shared/constants'
import { requireAuth } from '@/lib/services/auth'
import { getUserSubscriptionForBilling } from '@/lib/repositories/subscriptions'

export default async function BillingPage() {
  const t = await getTranslations('billing')
  const user = await requireAuth()
  const { data: subscription } = await getUserSubscriptionForBilling(user.id)

  const currentPlan = subscription?.plan ?? 'free'
  const isPremium = currentPlan !== 'free'
  const isLifetime = currentPlan === 'premium_lifetime'

  const FREE_FEATURES = [
    { text: t('freePlanFeatures.0'), included: true },
    { text: t('freePlanFeatures.1'), included: true },
    { text: t('freePlanFeatures.2'), included: true },
    { text: t('features.3'), included: false },
    { text: t('features.4'), included: false },
    { text: t('features.5'), included: false },
  ]

  const PREMIUM_FEATURES = [
    t('features.0'),
    t('features.1'),
    t('features.2'),
    t('features.3'),
    t('features.4'),
    t('features.5'),
  ]

  const PAID_PLANS = [
    {
      id: 'monthly' as const,
      planKey: 'premium_monthly',
      name: t('plans.monthly.name'),
      price: PRICING.monthly,
      per: t('plans.monthly.period'),
      badge: null as string | null,
      description: t('plans.monthly.description'),
      highlight: false,
    },
    {
      id: 'yearly' as const,
      planKey: 'premium_yearly',
      name: t('plans.yearly.name'),
      price: PRICING.yearly,
      per: t('plans.yearly.period'),
      badge: t('plans.yearly.badge') as string | null,
      description: t('plans.yearly.description'),
      highlight: true,
    },
    {
      id: 'lifetime' as const,
      planKey: 'premium_lifetime',
      name: t('plans.lifetime.name'),
      price: PRICING.lifetime,
      per: t('plans.lifetime.period'),
      badge: null as string | null,
      description: t('plans.lifetime.description'),
      highlight: false,
    },
  ]

  const renewalInfo = (() => {
    if (!isPremium || isLifetime) return null
    if (!subscription?.current_period_end) return null
    const date = new Date(subscription.current_period_end).toLocaleDateString()
    return subscription.cancel_at_period_end ? `Cancels ${date}` : `Renews ${date}`
  })()

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">{t('title')}</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">{t('description')}</p>
      </div>

      {/* Active plan banner — premium only */}
      {isPremium && (
        <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 p-5 text-white flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Zap className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold uppercase tracking-widest text-indigo-200">{t('activePlanLabel')}</span>
            </div>
            <p className="font-bold text-lg leading-tight">
              {currentPlan === 'premium_monthly' && `${t('plans.monthly.name')} Premium`}
              {currentPlan === 'premium_yearly' && `${t('plans.yearly.name')} Premium`}
              {currentPlan === 'premium_lifetime' && `${t('plans.lifetime.name')} Premium`}
            </p>
            {renewalInfo && (
              <p className="text-sm text-indigo-200 mt-0.5">{renewalInfo}</p>
            )}
            {isLifetime && (
              <p className="text-sm text-indigo-200 mt-0.5">{t('lifetimeAccess')}</p>
            )}
          </div>
          {!isLifetime && subscription?.stripe_customer_id && <PortalButton />}
        </div>
      )}

      {/* Plan cards — always shown */}
      <div>
        <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-1">
          {isPremium ? t('planOverview') : t('choosePlan')}
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-5">
          {isPremium ? t('premiumActive') : t('upgradePrompt')}
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
                  {t('freePlan.currentPlan')}
                </span>
              </div>
            )}
            <div className="mb-5 pt-1">
              <p className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">{t('freePlan.name')}</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-stone-900 dark:text-stone-100">{t('freePlan.price')}</span>
                <span className="text-sm text-stone-400 dark:text-stone-500 mb-1">{t('freePlan.period')}</span>
              </div>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">{t('freePlan.noCreditCard')}</p>
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
              {currentPlan === 'free' ? t('freePlan.currentPlan') : t('freePlan.freeTier')}
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
                      {t('currentPlan')}
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
                </ul>

                {isActive ? (
                  <div className="py-2.5 px-4 rounded-xl text-sm font-semibold text-center text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30">
                    {t('currentPlan')}
                  </div>
                ) : !isPremium ? (
                  <CheckoutButton plan={plan.id} label={t('upgradeTo', { plan: plan.name })} highlight={plan.highlight} />
                ) : currentPlan === 'premium_monthly' && plan.id === 'yearly' ? (
                  <UpgradeButton plan="yearly" label={t('upgradeToYearly')} />
                ) : (currentPlan === 'premium_monthly' || currentPlan === 'premium_yearly') && plan.id === 'lifetime' ? (
                  <UpgradeButton plan="lifetime" label={t('upgradeToLifetime')} />
                ) : (
                  <div className="py-2.5 px-4 rounded-xl text-sm font-semibold text-center text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-[var(--dark-elevated)]">
                    {t('notAvailable')}
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
          <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200 mb-1">{t('promoCode')}</h3>
          <p className="text-xs text-stone-400 dark:text-stone-500 mb-4">{t('promoDesc')}</p>
          <PromoCodeInput />
        </div>
      )}
    </div>
  )
}
