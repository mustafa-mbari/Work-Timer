'use client'

import Link from 'next/link'
import { ArrowRight, Clock, Hash, CalendarDays, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Database } from '@/lib/shared/types'

type Subscription = Database['public']['Tables']['subscriptions']['Row']
type UserStats = Database['public']['Tables']['user_stats']['Row']

interface Props {
  subscription: Pick<Subscription, 'plan' | 'status' | 'current_period_end' | 'cancel_at_period_end'> | null
  stats: UserStats | null
  isPremium: boolean
  userEmail: string
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

export default function OverviewTab({ subscription, stats, isPremium, userEmail }: Props) {
  const plan = subscription?.plan ?? 'free'

  return (
    <div className="space-y-6">
      {/* KPI stat cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-indigo-500" />
              <span className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Hours</span>
            </div>
            <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              {formatHours(stats.total_hours)}
            </p>
            <p className="text-xs text-stone-400 dark:text-stone-600 mt-0.5">total tracked</p>
          </div>

          <div className="rounded-xl border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] p-4">
            <div className="flex items-center gap-2 mb-1">
              <Hash className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Entries</span>
            </div>
            <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              {stats.total_entries.toLocaleString()}
            </p>
            <p className="text-xs text-stone-400 dark:text-stone-600 mt-0.5">time entries</p>
          </div>

          <div className="rounded-xl border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] p-4">
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Days</span>
            </div>
            <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              {stats.active_days}
            </p>
            <p className="text-xs text-stone-400 dark:text-stone-600 mt-0.5">active days</p>
          </div>

          <div className="rounded-xl border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-rose-500" />
              <span className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Projects</span>
            </div>
            <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              {stats.total_projects}
            </p>
            <p className="text-xs text-stone-400 dark:text-stone-600 mt-0.5">
              {stats.last_active_date
                ? `last: ${new Date(stats.last_active_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : 'no activity yet'}
            </p>
          </div>
        </div>
      )}

      {/* Plan card */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Your Plan</CardTitle>
          <Badge variant={isPremium ? 'success' : 'secondary'}>
            {PLAN_LABEL[plan] || 'Free'}
          </Badge>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-1">{userEmail}</p>
          <div className="text-sm text-stone-600 dark:text-stone-400">
            {plan === 'free' && (
              <p>You&apos;re on the free plan. Upgrade to unlock cloud sync, export, and unlimited projects.</p>
            )}
            {plan === 'premium_monthly' && (
              <p>
                $1.99/month &middot;{' '}
                {subscription?.cancel_at_period_end
                  ? `Cancels on ${subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'N/A'}`
                  : `Renews ${subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'N/A'}`}
              </p>
            )}
            {plan === 'premium_yearly' && (
              <p>
                $9.99/year &middot;{' '}
                {subscription?.cancel_at_period_end
                  ? `Cancels on ${subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'N/A'}`
                  : `Renews ${subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'N/A'}`}
              </p>
            )}
            {plan === 'premium_lifetime' && (
              <p>Lifetime plan &middot; You own this forever. No renewals.</p>
            )}
          </div>
          <Button asChild variant="link" className="px-0 mt-2">
            <Link href="/billing">
              Manage billing <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-2">
          {isPremium && (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href="/analytics">
                  <TrendingUp className="h-4 w-4 mr-1.5" />
                  View Analytics
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/entries">
                  <Hash className="h-4 w-4 mr-1.5" />
                  Manage Entries
                </Link>
              </Button>
            </>
          )}
          {!isPremium && (
            <Button asChild size="sm">
              <Link href="/billing">Upgrade to Premium</Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href="/settings">Settings</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
