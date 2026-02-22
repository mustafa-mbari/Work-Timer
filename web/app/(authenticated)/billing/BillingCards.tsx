'use client'

import { useState } from 'react'
import { Check, X, Star } from 'lucide-react'
import CheckoutButton from './CheckoutButton'
import UpgradeButton from './UpgradeButton'
import { PRICING } from '@/lib/shared/constants'

interface Props {
  currentPlan: string
  isPremium: boolean
  isAllIn: boolean
  translations: {
    currentPlan: string
    notAvailable: string
    freePlan: { name: string; price: string; period: string; noCreditCard: string; currentPlan: string; freeTier: string }
    freePlanFeatures: Array<{ text: string; included: boolean }>
    premiumFeatures: string[]
    upgradeToYearly: string
  }
}

const ALLIN_FEATURES = [
  'Everything in Pro',
  'Team groups (up to 10 members)',
  'Shared time tracking',
  'Group analytics',
  'Earnings reports',
]

export default function BillingCards({ currentPlan, isPremium, isAllIn, translations: t }: Props) {
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('yearly')

  const proPrice = cycle === 'monthly' ? PRICING.monthly : PRICING.yearly
  const proPeriod = cycle === 'monthly' ? '/month' : '/year'
  const proCheckoutPlan = cycle === 'monthly' ? 'monthly' as const : 'yearly' as const
  const proPlanKey = cycle === 'monthly' ? 'premium_monthly' : 'premium_yearly'

  const allinPrice = cycle === 'monthly' ? PRICING.allinMonthly : PRICING.allinYearly
  const allinPeriod = cycle === 'monthly' ? '/month' : '/year'
  const allinCheckoutPlan = cycle === 'monthly' ? 'allin_monthly' as const : 'allin_yearly' as const
  const allinPlanKey = cycle === 'monthly' ? 'allin_monthly' : 'allin_yearly'

  const isProActive = currentPlan === proPlanKey || (currentPlan.startsWith('premium_') && currentPlan !== 'free')
  const isAllinActive = currentPlan === allinPlanKey || currentPlan.startsWith('allin')

  return (
    <div className="space-y-5">
      {/* Billing cycle toggle */}
      <div className="flex items-center justify-center gap-2">
        <div className="flex items-center bg-stone-100 dark:bg-[var(--dark-elevated)] rounded-xl p-1">
          <button
            onClick={() => setCycle('monthly')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              cycle === 'monthly'
                ? 'bg-white dark:bg-[var(--dark-card)] text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setCycle('yearly')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              cycle === 'yearly'
                ? 'bg-white dark:bg-[var(--dark-card)] text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
            }`}
          >
            Yearly
            <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-semibold">
              Save
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Free plan card */}
        <div className={`relative rounded-2xl border-2 p-6 flex flex-col ${
          currentPlan === 'free'
            ? 'border-indigo-400 dark:border-indigo-500 bg-white dark:bg-[var(--dark-card)]'
            : 'border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] opacity-60'
        }`}>
          {currentPlan === 'free' && (
            <div className="absolute -top-3 left-4">
              <span className="inline-flex items-center bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                {t.freePlan.currentPlan}
              </span>
            </div>
          )}
          <div className="mb-5 pt-1">
            <p className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">{t.freePlan.name}</p>
            <div className="flex items-end gap-1">
              <span className="text-4xl font-bold text-stone-900 dark:text-stone-100">{t.freePlan.price}</span>
              <span className="text-sm text-stone-400 dark:text-stone-500 mb-1">{t.freePlan.period}</span>
            </div>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">{t.freePlan.noCreditCard}</p>
          </div>
          <ul className="space-y-2.5 flex-1">
            {t.freePlanFeatures.map(f => (
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
            {currentPlan === 'free' ? t.freePlan.currentPlan : t.freePlan.freeTier}
          </div>
        </div>

        {/* Pro plan card */}
        <div className={`relative rounded-2xl border p-6 flex flex-col ${
          isProActive
            ? 'border-2 border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20'
            : !isPremium
              ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 shadow-md shadow-indigo-50 dark:shadow-indigo-900/10'
              : 'border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)]'
        }`}>
          {isProActive ? (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1 bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                {t.currentPlan}
              </span>
            </div>
          ) : !isPremium ? (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1 bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                <Star className="h-3 w-3" />
                Popular
              </span>
            </div>
          ) : null}
          <div className="mb-5">
            <p className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">Pro</p>
            <div className="flex items-end gap-0.5">
              <span className="text-4xl font-bold text-stone-900 dark:text-stone-100">${proPrice}</span>
              <span className="text-sm text-stone-400 dark:text-stone-500 mb-1">{proPeriod}</span>
            </div>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
              {cycle === 'yearly' ? 'Save 58% vs monthly' : 'Full access, cancel anytime'}
            </p>
          </div>
          <ul className="space-y-2.5 mb-6 flex-1">
            {t.premiumFeatures.map(f => (
              <li key={f} className="flex items-start gap-2 text-sm text-stone-600 dark:text-stone-400">
                <Check className={`h-4 w-4 mt-0.5 shrink-0 ${isProActive || !isPremium ? 'text-indigo-500' : 'text-emerald-500'}`} />
                {f}
              </li>
            ))}
          </ul>
          {isProActive ? (
            <div className="py-2.5 px-4 rounded-xl text-sm font-semibold text-center text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30">
              {t.currentPlan}
            </div>
          ) : !isPremium ? (
            <CheckoutButton plan={proCheckoutPlan} label={`Get Pro`} highlight />
          ) : currentPlan === 'premium_monthly' && cycle === 'yearly' ? (
            <UpgradeButton plan="yearly" label={t.upgradeToYearly} />
          ) : (
            <div className="py-2.5 px-4 rounded-xl text-sm font-semibold text-center text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-[var(--dark-elevated)]">
              {t.notAvailable}
            </div>
          )}
        </div>

        {/* All-In plan card */}
        <div className={`relative rounded-2xl border p-6 flex flex-col ${
          isAllinActive
            ? 'border-2 border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 shadow-lg'
            : 'border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)]'
        }`}>
          {isAllinActive && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1 bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                {t.currentPlan}
              </span>
            </div>
          )}
          <div className="mb-5">
            <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">All-In</p>
            <div className="flex items-end gap-0.5">
              <span className="text-4xl font-bold text-stone-900 dark:text-stone-100">${allinPrice}</span>
              <span className="text-sm text-stone-400 dark:text-stone-500 mb-1">{allinPeriod}</span>
            </div>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
              {cycle === 'yearly' ? 'Save 17% with annual billing' : 'Billed monthly, cancel anytime'}
            </p>
          </div>
          <ul className="space-y-2.5 mb-6 flex-1">
            {ALLIN_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2 text-sm text-stone-600 dark:text-stone-400">
                <Check className="h-4 w-4 mt-0.5 shrink-0 text-indigo-500" />
                {f}
              </li>
            ))}
          </ul>
          {isAllinActive ? (
            <div className="py-2.5 px-4 rounded-xl text-sm font-semibold text-center text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30">
              {t.currentPlan}
            </div>
          ) : !isAllIn ? (
            <CheckoutButton plan={allinCheckoutPlan} label="Get All-In" highlight={false} />
          ) : (
            <div className="py-2.5 px-4 rounded-xl text-sm font-semibold text-center text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-[var(--dark-elevated)]">
              {t.notAvailable}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
