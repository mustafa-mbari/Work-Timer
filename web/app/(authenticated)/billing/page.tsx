import { Zap } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('billing')
  return { title: t('title') }
}
import BillingCards from './BillingCards'
import PortalButton from './PortalButton'
import PromoCodeInput from './PromoCodeInput'
import { requireAuth } from '@/lib/services/auth'
import { getUserSubscriptionForBilling } from '@/lib/repositories/subscriptions'

export default async function BillingPage() {
  const t = await getTranslations('billing')
  const user = await requireAuth()
  const { data: subscription } = await getUserSubscriptionForBilling(user.id)

  const currentPlan = subscription?.plan ?? 'free'
  const isPremium = currentPlan !== 'free'
  const isAllIn = currentPlan.startsWith('allin')

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

  const renewalInfo = (() => {
    if (!isPremium) return null
    if (!subscription?.current_period_end) return null
    const date = new Date(subscription.current_period_end).toLocaleDateString()
    return subscription.cancel_at_period_end ? `Cancels ${date}` : `Renews ${date}`
  })()

  const planDisplayName: Record<string, string> = {
    premium_monthly: `${t('plans.monthly.name')} Pro`,
    premium_yearly: `${t('plans.yearly.name')} Pro`,
    premium_lifetime: 'Lifetime Premium',
    allin_monthly: 'All-In Monthly',
    allin_yearly: 'All-In Yearly',
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Active plan banner — premium only */}
      {isPremium && (
        <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 p-5 text-white flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Zap className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold uppercase tracking-widest text-indigo-200">{t('activePlanLabel')}</span>
            </div>
            <p className="font-bold text-lg leading-tight">
              {planDisplayName[currentPlan] ?? currentPlan}
            </p>
            {renewalInfo && (
              <p className="text-sm text-indigo-200 mt-0.5">{renewalInfo}</p>
            )}
            {currentPlan === 'premium_lifetime' && (
              <p className="text-sm text-indigo-200 mt-0.5">{t('lifetimeAccess')}</p>
            )}
          </div>
          {subscription?.stripe_customer_id && <PortalButton />}
        </div>
      )}

      {/* Plan cards */}
      <div>
        <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-1">
          {isPremium ? t('planOverview') : t('choosePlan')}
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-5">
          {isPremium ? t('premiumActive') : t('upgradePrompt')}
        </p>

        <BillingCards
          currentPlan={currentPlan}
          isPremium={isPremium}
          isAllIn={isAllIn}
          translations={{
            currentPlan: t('currentPlan'),
            notAvailable: t('notAvailable'),
            freePlan: {
              name: t('freePlan.name'),
              price: t('freePlan.price'),
              period: t('freePlan.period'),
              noCreditCard: t('freePlan.noCreditCard'),
              currentPlan: t('freePlan.currentPlan'),
              freeTier: t('freePlan.freeTier'),
            },
            freePlanFeatures: FREE_FEATURES,
            premiumFeatures: PREMIUM_FEATURES,
            upgradeToYearly: t('upgradeToYearly'),
          }}
        />
      </div>

      {/* Promo code */}
      <div className="rounded-2xl border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] p-6">
        <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200 mb-1">{t('promoCode')}</h3>
        <p className="text-xs text-stone-400 dark:text-stone-500 mb-4">{t('promoDesc')}</p>
        <PromoCodeInput />
      </div>
    </div>
  )
}
