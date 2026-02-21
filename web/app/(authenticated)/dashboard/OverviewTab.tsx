'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
  ArrowRight, Clock, Hash, CalendarDays, TrendingUp,
  Zap, BarChart2, CheckCircle2, FolderOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ProjectsCard from './ProjectsCard'
import TagsCard from './TagsCard'
import type { Database } from '@/lib/shared/types'
import type { ProjectFull } from '@/lib/repositories/projects'
import type { TagFull } from '@/lib/repositories/tags'

type Subscription = Database['public']['Tables']['subscriptions']['Row']
type UserStats = Database['public']['Tables']['user_stats']['Row']

interface Props {
  subscription: Pick<Subscription, 'plan' | 'status' | 'current_period_end' | 'cancel_at_period_end'> | null
  stats: UserStats | null
  isPremium: boolean
  userEmail: string
  projects: ProjectFull[]
  tags: TagFull[]
  defaultHourlyRate: number | null
  currency: string
}

const PLAN_LABEL: Record<string, string> = {
  free: 'Free',
  premium_monthly: 'Premium Monthly',
  premium_yearly: 'Premium Yearly',
  premium_lifetime: 'Premium Lifetime',
}

function formatHours(h: number): string {
  if (h >= 1000) return `${(h / 1000).toFixed(1)}k`
  return h % 1 === 0 ? String(h) : h.toFixed(1)
}

export default function OverviewTab({ subscription, stats, isPremium, userEmail, projects, tags, defaultHourlyRate, currency }: Props) {
  const t = useTranslations('dashboard.overview')
  const plan = subscription?.plan ?? 'free'

  const STAT_CARDS = stats ? [
    {
      label: t('stats.totalHours'),
      value: `${formatHours(stats.total_hours)}h`,
      sub: t('stats.totalHoursDesc'),
      icon: Clock,
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      accent: 'border-t-2 border-t-indigo-400',
    },
    {
      label: t('stats.timeEntries'),
      value: stats.total_entries.toLocaleString(),
      sub: t('stats.timeEntriesDesc'),
      icon: Hash,
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      accent: 'border-t-2 border-t-emerald-400',
    },
    {
      label: t('stats.activeDays'),
      value: stats.active_days.toLocaleString(),
      sub: t('stats.activeDaysDesc'),
      icon: CalendarDays,
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      accent: 'border-t-2 border-t-amber-400',
    },
    {
      label: t('stats.projects'),
      value: stats.total_projects.toLocaleString(),
      sub: stats.last_active_date
        ? t('stats.lastActive', { date: new Date(stats.last_active_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) })
        : t('stats.noActivity'),
      icon: FolderOpen,
      iconBg: 'bg-rose-100 dark:bg-rose-900/30',
      iconColor: 'text-rose-600 dark:text-rose-400',
      accent: 'border-t-2 border-t-rose-400',
    },
  ] : []

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── KPI stat cards ── */}
      {stats && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {STAT_CARDS.map(({ label, value, sub, icon: Icon, iconBg, iconColor, accent }) => (
            <div
              key={label}
              className={`rounded-2xl bg-white dark:bg-[var(--dark-card)] shadow-sm border border-stone-100 dark:border-[var(--dark-border)] p-5 ${accent}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${iconColor}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-stone-800 dark:text-stone-100 leading-none mb-1">
                {value}
              </p>
              <p className="text-xs font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wide">
                {label}
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-600 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── No stats yet ── */}
      {!stats && (
        <div className="rounded-2xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm p-10 flex flex-col items-center gap-3 text-center">
          <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
            <Clock className="h-7 w-7 text-indigo-400" />
          </div>
          <p className="font-semibold text-stone-700 dark:text-stone-200">{t('noActivityTitle')}</p>
          <p className="text-sm text-stone-400 dark:text-stone-500 max-w-xs">
            {t('noActivityDesc')}
          </p>
        </div>
      )}

      {/* ── Projects & Tags cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProjectsCard initialProjects={projects} isPremium={isPremium} defaultHourlyRate={defaultHourlyRate} currency={currency} />
        <TagsCard initialTags={tags} />
      </div>

      {/* ── Bottom two-column row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Plan card */}
        <div className="rounded-2xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                <Zap className="h-4 w-4 text-indigo-500" />
              </div>
              <span className="font-semibold text-stone-800 dark:text-stone-100">{t('plan.title')}</span>
            </div>
            <Badge variant={isPremium ? 'success' : 'secondary'} className="text-xs">
              {PLAN_LABEL[plan] || 'Free'}
            </Badge>
          </div>

          <p className="text-sm text-stone-500 dark:text-stone-400 mb-1">{userEmail}</p>
          <div className="text-sm text-stone-600 dark:text-stone-400 mb-4">
            {plan === 'free' && <p>{t('plan.freeDesc')}</p>}
            {plan === 'premium_monthly' && (
              <p>
                {t('plan.monthlyDesc')} &middot;{' '}
                {subscription?.cancel_at_period_end
                  ? `${t('plan.cancels')} ${subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'N/A'}`
                  : `${t('plan.renews')} ${subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'N/A'}`}
              </p>
            )}
            {plan === 'premium_yearly' && (
              <p>
                {t('plan.yearlyDesc')} &middot;{' '}
                {subscription?.cancel_at_period_end
                  ? `${t('plan.cancels')} ${subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'N/A'}`
                  : `${t('plan.renews')} ${subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'N/A'}`}
              </p>
            )}
            {plan === 'premium_lifetime' && <p>{t('plan.lifetimeDesc')}</p>}
          </div>

          <Button asChild variant="outline" size="sm" className="rounded-xl gap-1.5">
            <Link href="/billing">
              {t('plan.manageBilling')} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Quick actions card */}
        <div className="rounded-2xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <span className="font-semibold text-stone-800 dark:text-stone-100">{t('quickActions.title')}</span>
          </div>

          <div className="flex flex-col gap-2">
            {isPremium ? (
              <>
                <Button asChild variant="outline" size="sm" className="justify-start rounded-xl gap-2">
                  <Link href="/analytics">
                    <BarChart2 className="h-4 w-4 text-indigo-500" />
                    {t('quickActions.analytics')}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="justify-start rounded-xl gap-2">
                  <Link href="/entries">
                    <Hash className="h-4 w-4 text-emerald-500" />
                    {t('quickActions.entries')}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="justify-start rounded-xl gap-2">
                  <Link href="/settings">
                    <TrendingUp className="h-4 w-4 text-amber-500" />
                    {t('quickActions.settings')}
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="sm" className="justify-start rounded-xl gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Link href="/billing">
                    <Zap className="h-4 w-4" />
                    {t('quickActions.upgrade')}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="justify-start rounded-xl gap-2">
                  <Link href="/settings">
                    <TrendingUp className="h-4 w-4 text-amber-500" />
                    {t('quickActions.settings')}
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
