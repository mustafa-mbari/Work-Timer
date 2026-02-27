'use client'

import { useState } from 'react'
import { Check, X, Star, Loader2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { PRICING } from '@/lib/shared/constants'
import { cn } from '@/lib/utils'

type BillingCycle = 'monthly' | 'yearly'
type TeamTier = '10' | '20' | 'contact'
type FeatureValue = true | false | string

interface PricingPlansProps {
  isLoggedIn: boolean
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
          <span className="ml-1 font-medium text-stone-500 dark:text-stone-400 no-underline" style={{ textDecoration: 'none' }}>
            · {value}
          </span>
        )}
      </span>
    </li>
  )
}

export default function PricingPlans({ isLoggedIn }: PricingPlansProps) {
  const [cycle, setCycle] = useState<BillingCycle>('monthly')
  const [teamTier, setTeamTier] = useState<TeamTier>('10')
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  const proPrice = cycle === 'monthly' ? PRICING.monthly : PRICING.yearly
  const proCheckoutPlan = cycle === 'monthly' ? 'monthly' : 'yearly'
  const proSavingsPct = Math.round((1 - PRICING.yearly / (PRICING.monthly * 12)) * 100)

  const teamPriceMonthly = teamTier === '10' ? PRICING.team10Monthly : PRICING.team20Monthly
  const teamPriceYearly = teamTier === '10' ? PRICING.team10Yearly : PRICING.team20Yearly
  const teamPrice = cycle === 'monthly' ? teamPriceMonthly : teamPriceYearly
  const teamCheckoutPlan = teamTier !== 'contact'
    ? (`team_${teamTier}_${cycle}` as string)
    : null
  const teamSavingsPct = teamTier !== 'contact'
    ? Math.round((1 - teamPriceYearly / (teamPriceMonthly * 12)) * 100)
    : 0

  async function handleCheckout(plan: string) {
    if (!isLoggedIn) {
      window.location.href = '/register'
      return
    }
    setLoadingPlan(plan)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || 'Failed to create checkout session')
        setLoadingPlan(null)
      }
    } catch {
      toast.error('Failed to start checkout')
      setLoadingPlan(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Billing cycle toggle */}
      <div className="flex items-center justify-center">
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

      {/* 3-column card grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* FREE CARD */}
        <div className="relative rounded-2xl border-2 border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] p-6 flex flex-col">
          <div className="mb-5">
            <p className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">Free</p>
            <div className="flex items-end gap-1">
              <span className="text-4xl font-bold text-stone-900 dark:text-stone-100">$0</span>
              <span className="text-sm text-stone-400 dark:text-stone-500 mb-1">/mo</span>
            </div>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">No credit card required</p>
          </div>
          <ul className="space-y-2.5 flex-1 mb-6">
            {FEATURES.map(f => (
              <FeatureRow key={f.label} label={f.label} value={f.free} accent={false} />
            ))}
          </ul>
          <button
            onClick={() => window.location.href = isLoggedIn ? '/dashboard' : '/register'}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-[var(--dark-elevated)] hover:bg-stone-200 dark:hover:bg-[var(--dark-hover)] transition-colors"
          >
            Get started free
          </button>
        </div>

        {/* PRO CARD */}
        <div className="relative rounded-2xl border-2 border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 shadow-md shadow-indigo-100 dark:shadow-indigo-900/10 p-6 flex flex-col">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center gap-1 bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
              <Star className="h-3 w-3 fill-current" />
              Most Popular
            </span>
          </div>
          <div className="mb-5 pt-1">
            <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">Pro</p>
            <div className="flex items-end gap-0.5">
              <span className="text-4xl font-bold text-stone-900 dark:text-stone-100">${proPrice}</span>
              <span className="text-sm text-stone-400 dark:text-stone-500 mb-1">
                {cycle === 'monthly' ? '/mo' : '/yr'}
              </span>
              {cycle === 'yearly' && (
                <span className="ml-2 mb-1 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-semibold">
                  Save {proSavingsPct}%
                </span>
              )}
            </div>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
              {cycle === 'yearly'
                ? `~$${(PRICING.yearly / 12).toFixed(2)}/mo · billed annually`
                : 'Full access, cancel anytime'}
            </p>
          </div>
          <ul className="space-y-2.5 flex-1 mb-6">
            {FEATURES.map(f => (
              <FeatureRow key={f.label} label={f.label} value={f.pro} accent />
            ))}
          </ul>
          <button
            onClick={() => handleCheckout(proCheckoutPlan)}
            disabled={loadingPlan === proCheckoutPlan}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold bg-indigo-500 hover:bg-indigo-600 text-white transition-colors disabled:opacity-60"
          >
            {loadingPlan === proCheckoutPlan && <Loader2 className="h-4 w-4 animate-spin" />}
            {loadingPlan === proCheckoutPlan ? 'Redirecting...' : 'Get Pro'}
          </button>
        </div>

        {/* TEAM CARD */}
        <div className="relative rounded-2xl border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] p-6 flex flex-col">
          <div className="mb-4">
            <p className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Team
            </p>

            {teamTier === 'contact' ? (
              <div>
                <p className="text-4xl font-bold text-stone-900 dark:text-stone-100">Custom</p>
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">Tailored for larger teams</p>
              </div>
            ) : (
              <div>
                <div className="flex items-end gap-0.5">
                  <span className="text-4xl font-bold text-stone-900 dark:text-stone-100">${teamPrice}</span>
                  <span className="text-sm text-stone-400 dark:text-stone-500 mb-1">
                    {cycle === 'monthly' ? '/mo' : '/yr'}
                  </span>
                  {cycle === 'yearly' && (
                    <span className="ml-2 mb-1 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-semibold">
                      Save {teamSavingsPct}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                  {cycle === 'yearly'
                    ? `~$${(teamPriceYearly / 12).toFixed(0)}/mo · billed annually`
                    : 'Cancel anytime'}
                </p>
              </div>
            )}
          </div>

          <ul className="space-y-2.5 flex-1 mb-4">
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

          {teamTier === 'contact' ? (
            <a
              href="mailto:hello@w-timer.com"
              className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-semibold border border-stone-300 dark:border-[var(--dark-border)] text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-[var(--dark-elevated)] transition-colors"
            >
              Contact us
            </a>
          ) : (
            <button
              onClick={() => teamCheckoutPlan && handleCheckout(teamCheckoutPlan)}
              disabled={!teamCheckoutPlan || loadingPlan === teamCheckoutPlan}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 transition-colors disabled:opacity-60"
            >
              {loadingPlan === teamCheckoutPlan && <Loader2 className="h-4 w-4 animate-spin" />}
              {loadingPlan === teamCheckoutPlan ? 'Redirecting...' : 'Get Team'}
            </button>
          )}
        </div>
      </div>

      {/* Trust badges */}
      <div className="flex flex-wrap gap-6 justify-center">
        {[
          { icon: '🔒', label: 'Privacy first — no tracking' },
          { icon: '📴', label: 'Works fully offline' },
          { icon: '💳', label: 'Cancel anytime' },
        ].map(({ icon, label }) => (
          <div key={label} className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
            <span>{icon}</span>
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
