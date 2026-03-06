'use client'

import { useState } from 'react'
import { Check, X, Star, Users } from 'lucide-react'
import CheckoutButton from './CheckoutButton'
import UpgradeButton from './UpgradeButton'
import { PRICING } from '@/lib/shared/constants'
import { cn } from '@/lib/utils'

type TeamTier = '10' | '20' | 'contact'
type FeatureValue = true | false | string

interface Props {
  currentPlan: string
  isPremium: boolean
  isAllIn: boolean
  currency: string
  translations: {
    currentPlan: string
    notAvailable: string
    freePlan: { name: string; price: string; period: string; noCreditCard: string; currentPlan: string; freeTier: string }
    freePlanFeatures: Array<{ text: string; included: boolean }>
    premiumFeatures: string[]
    upgradeToYearly: string
  }
}

interface Feature {
  label: string
  free: FeatureValue
  pro: FeatureValue
  team: FeatureValue
}

const FEATURES: Feature[] = [
  { label: 'Projects',           free: 'Up to 5',    pro: 'Unlimited',     team: 'Unlimited' },
  { label: 'History',            free: '14 days',    pro: 'Full history',  team: 'Full history' },
  { label: 'Timer modes',        free: 'All modes',  pro: 'All modes',     team: 'All modes' },
  { label: 'Statistics',         free: 'Limited',    pro: 'Unlimited',     team: 'Unlimited' },
  { label: 'Earnings reports',   free: false,        pro: true,            team: true },
  { label: 'Cloud sync',         free: false,        pro: true,            team: true },
  { label: 'Multi-device',       free: false,        pro: true,            team: true },
  { label: 'CSV / Excel export', free: false,        pro: true,            team: true },
  { label: 'Group workspace',    free: false,        pro: false,           team: true },
  { label: 'Timesheet approval', free: false,        pro: false,           team: true },
  { label: 'Team reports',       free: false,        pro: false,           team: true },
  { label: 'Admin controls',     free: false,        pro: false,           team: true },
]

function FeatureRow({
  label,
  value,
  accent = false,
}: {
  label: string
  value: FeatureValue
  accent?: boolean
}) {
  const included = value !== false
  return (
    <li className="flex items-center gap-2 text-sm min-w-0">
      {included ? (
        <Check className={cn('h-4 w-4 shrink-0', accent ? 'text-indigo-500' : 'text-emerald-500')} />
      ) : (
        <X className="h-4 w-4 shrink-0 text-stone-300 dark:text-stone-600" />
      )}
      <span className={cn(
        'truncate',
        included ? 'text-stone-700 dark:text-stone-300' : 'text-stone-350 dark:text-stone-600 line-through'
      )}>
        {label}
        {typeof value === 'string' && (
          <span className="ml-1 font-medium text-stone-500 dark:text-stone-400" style={{ textDecoration: 'none' }}>
            · {value}
          </span>
        )}
      </span>
    </li>
  )
}

export default function BillingCards({ currentPlan, isPremium, isAllIn, currency, translations: t }: Props) {
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [teamTier, setTeamTier] = useState<TeamTier>('10')

  const proPrice = cycle === 'monthly' ? PRICING.monthly : PRICING.yearly
  const proPeriod = cycle === 'monthly' ? '/month' : '/year'
  const proCheckoutPlan = cycle === 'monthly' ? 'monthly' as const : 'yearly' as const
  const proPlanKey = cycle === 'monthly' ? 'premium_monthly' : 'premium_yearly'
  const proSavingsPct = Math.round((1 - PRICING.yearly / (PRICING.monthly * 12)) * 100)

  const teamPriceMonthly = teamTier === '10' ? PRICING.team10Monthly : PRICING.team20Monthly
  const teamPriceYearly = teamTier === '10' ? PRICING.team10Yearly : PRICING.team20Yearly
  const teamPrice = cycle === 'monthly' ? teamPriceMonthly : teamPriceYearly
  const teamCheckoutPlan = teamTier !== 'contact'
    ? (`team_${teamTier}_${cycle}` as 'team_10_monthly' | 'team_10_yearly' | 'team_20_monthly' | 'team_20_yearly')
    : null
  const teamPlanKey = teamTier !== 'contact' ? `team_${teamTier}_${cycle}` : null
  const teamSavingsPct = teamTier !== 'contact'
    ? Math.round((1 - teamPriceYearly / (teamPriceMonthly * 12)) * 100)
    : 0

  const isProActive = currentPlan === proPlanKey
  const isAllinActive = isAllIn || currentPlan === teamPlanKey

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Billing cycle toggle */}
      <div className="flex items-center justify-center gap-2">
        <div className="flex items-center bg-stone-100 dark:bg-[var(--dark-elevated)] rounded-xl p-1">
          <button
            onClick={() => setCycle('monthly')}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-lg transition-colors',
              cycle === 'monthly'
                ? 'bg-white dark:bg-[var(--dark-card)] text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setCycle('yearly')}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5',
              cycle === 'yearly'
                ? 'bg-white dark:bg-[var(--dark-card)] text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
            )}
          >
            Yearly
            <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-semibold">
              Save {proSavingsPct}%
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {/* Free plan card */}
        <div className={cn(
          'relative rounded-2xl border-2 p-5 flex flex-col',
          currentPlan === 'free'
            ? 'border-indigo-400 dark:border-indigo-500 bg-white dark:bg-[var(--dark-card)]'
            : 'border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] opacity-60'
        )}>
          {currentPlan === 'free' && (
            <div className="absolute -top-3 left-4">
              <span className="inline-flex items-center bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                {t.freePlan.currentPlan}
              </span>
            </div>
          )}
          <div className="mb-4 pt-1">
            <p className="text-base font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">{t.freePlan.name}</p>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-bold text-stone-900 dark:text-stone-100">{currency}0</span>
              <span className="text-sm text-stone-400 dark:text-stone-500 mb-1">{t.freePlan.period}</span>
            </div>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">{t.freePlan.noCreditCard}</p>
          </div>
          <ul className="space-y-2 flex-1 mb-5">
            {FEATURES.map(f => (
              <FeatureRow key={f.label} label={f.label} value={f.free} accent={false} />
            ))}
          </ul>
          <div className="py-2.5 px-4 rounded-xl text-sm font-semibold text-center text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-[var(--dark-elevated)]">
            {currentPlan === 'free' ? t.freePlan.currentPlan : t.freePlan.freeTier}
          </div>
        </div>

        {/* Pro plan card */}
        <div className={cn(
          'relative rounded-2xl border p-5 flex flex-col',
          isProActive
            ? 'border-2 border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20'
            : !isPremium
              ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 shadow-md shadow-indigo-50 dark:shadow-indigo-900/10'
              : 'border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)]'
        )}>
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
          <div className="mb-4">
            <p className="text-base font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">Pro</p>
            <div className="flex items-end gap-0.5">
              <span className="text-3xl font-bold text-stone-900 dark:text-stone-100">{currency}{proPrice}</span>
              <span className="text-sm text-stone-400 dark:text-stone-500 mb-1">{proPeriod}</span>
              {cycle === 'yearly' && (
                <span className="ml-2 mb-1 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-semibold">
                  Save {proSavingsPct}%
                </span>
              )}
            </div>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
              {cycle === 'yearly' ? `Save ${proSavingsPct}% vs monthly` : 'Full access, cancel anytime'}
            </p>
          </div>
          <ul className="space-y-2 flex-1 mb-5">
            {FEATURES.map(f => (
              <FeatureRow key={f.label} label={f.label} value={f.pro} accent />
            ))}
          </ul>
          {isProActive ? (
            <div className="py-2.5 px-4 rounded-xl text-sm font-semibold text-center text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30">
              {t.currentPlan}
            </div>
          ) : !isPremium ? (
            <CheckoutButton plan={proCheckoutPlan} label="Get Pro" highlight />
          ) : currentPlan === 'premium_monthly' && cycle === 'yearly' ? (
            <UpgradeButton plan="yearly" label={t.upgradeToYearly} />
          ) : (
            <div className="py-2.5 px-4 rounded-xl text-sm font-semibold text-center text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-[var(--dark-elevated)]">
              {t.notAvailable}
            </div>
          )}
        </div>

        {/* Team plan card */}
        <div className={cn(
          'relative rounded-2xl border p-5 flex flex-col',
          isAllinActive
            ? 'border-2 border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 shadow-lg'
            : 'border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)]'
        )}>
          {isAllinActive && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1 bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                {t.currentPlan}
              </span>
            </div>
          )}
          <div className="mb-4">
            <p className="text-base font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Team
            </p>

            {teamTier === 'contact' ? (
              <div>
                <p className="text-3xl font-bold text-stone-900 dark:text-stone-100">Custom</p>
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">Tailored for larger teams</p>
              </div>
            ) : (
              <div>
                <div className="flex items-end gap-0.5">
                  <span className="text-3xl font-bold text-stone-900 dark:text-stone-100">{currency}{teamPrice}</span>
                  <span className="text-sm text-stone-400 dark:text-stone-500 mb-1">
                    {cycle === 'monthly' ? '/month' : '/year'}
                  </span>
                  {cycle === 'yearly' && (
                    <span className="ml-2 mb-1 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-semibold">
                      Save {teamSavingsPct}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                  {cycle === 'yearly' ? `Save ${teamSavingsPct}% with annual billing` : 'Billed monthly, cancel anytime'}
                </p>
              </div>
            )}
          </div>

          <ul className="space-y-2 flex-1 mb-4">
            {FEATURES.map(f => (
              <FeatureRow key={f.label} label={f.label} value={f.team} accent />
            ))}
            {teamTier !== 'contact' && (
              <FeatureRow label={`Up to ${teamTier} members`} value={true} accent />
            )}
          </ul>

          {/* Tier selector */}
          <div className="flex gap-1.5 mb-3">
            {(['10', '20', 'contact'] as TeamTier[]).map(tier => (
              <button
                key={tier}
                onClick={() => setTeamTier(tier)}
                className={cn(
                  'flex-1 px-2 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                  teamTier === tier
                    ? 'bg-indigo-500 text-white'
                    : 'bg-stone-100 dark:bg-[var(--dark-elevated)] text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-[var(--dark-hover)]'
                )}
              >
                {tier === 'contact' ? 'Custom' : `Up to ${tier}`}
              </button>
            ))}
          </div>

          {isAllinActive ? (
            <div className="py-2.5 px-4 rounded-xl text-sm font-semibold text-center text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30">
              {t.currentPlan}
            </div>
          ) : teamTier === 'contact' ? (
            <a
              href="mailto:hello@w-timer.com"
              className="py-2.5 px-4 rounded-xl text-sm font-semibold text-center border border-stone-300 dark:border-[var(--dark-border)] text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-[var(--dark-elevated)] transition-colors"
            >
              Contact us
            </a>
          ) : !isAllIn && teamCheckoutPlan ? (
            <CheckoutButton plan={teamCheckoutPlan} label="Get Team" highlight={false} />
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
