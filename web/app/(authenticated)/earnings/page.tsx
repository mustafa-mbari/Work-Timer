import { Suspense } from 'react'
import { DollarSign, TrendingUp, FolderKanban, Clock, Lock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Earnings' }

import EarningsView from './EarningsView'
import EarningsChart from './EarningsChart'
import EarningsFilters from './EarningsFilters'
import EarningsProjectsManager from './EarningsProjectsManager'
import { requireAuth } from '@/lib/services/auth'
import { isPremiumUser } from '@/lib/services/billing'
import { getEarningsReport } from '@/lib/services/earnings'
import { getUserProjects } from '@/lib/repositories/projects'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// Preview data for free users (blurred)
const PREVIEW_DATA = {
  currency: 'USD',
  default_rate: 75,
  projects: [
    { id: '1', name: 'Frontend Dev', color: '#6366f1', hours: 48.5, rate: 75, total: 3637.5 },
    { id: '2', name: 'Backend API', color: '#10b981', hours: 35.2, rate: 100, total: 3520 },
    { id: '3', name: 'Design Work', color: '#f59e0b', hours: 22.8, rate: 60, total: 1368 },
    { id: '4', name: 'Meetings', color: '#ef4444', hours: 15.0, rate: 75, total: 1125 },
  ],
  grand_total: 9650.5,
  total_hours: 121.5,
  total_projects: 4,
  daily_earnings: null,
}

export default async function EarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string }>
}) {
  const user = await requireAuth()

  const premium = await isPremiumUser(user.id)

  // Free users see a blurred preview with an upgrade prompt
  if (!premium) {
    const p = PREVIEW_DATA
    const avgRate = p.projects.length > 0
      ? p.projects.reduce((s, proj) => s + proj.rate, 0) / p.projects.length
      : 0
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="relative">
          <div className="blur-[2px] pointer-events-none select-none opacity-60 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: <DollarSign className="h-4 w-4 text-emerald-500" />, label: 'Grand Total', value: `$${p.grand_total.toLocaleString()}` },
                { icon: <TrendingUp className="h-4 w-4 text-indigo-500" />, label: 'Avg Rate', value: `$${avgRate.toFixed(0)}/hr` },
                { icon: <Clock className="h-4 w-4 text-amber-500" />, label: 'Total Hours', value: p.total_hours.toFixed(1) },
                { icon: <FolderKanban className="h-4 w-4 text-purple-500" />, label: 'Projects', value: p.total_projects },
              ].map(({ icon, label, value }) => (
                <Card key={label}><CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs text-stone-500">{label}</span></div>
                  <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{value}</p>
                </CardContent></Card>
              ))}
            </div>
            <EarningsView data={p} />
          </div>
          <div className="absolute inset-x-0 top-12 flex justify-center z-10 px-4">
            <div className="bg-white/95 dark:bg-[var(--dark-card)]/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-stone-200 dark:border-[var(--dark-border)] p-8 text-center max-w-md w-full">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mx-auto mb-4">
                <Lock className="h-7 w-7 text-indigo-500 dark:text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">Unlock Earnings Reports</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">
                Upgrade to Premium to track your project earnings, set hourly rates, and export detailed reports.
              </p>
              <a
                href="/billing"
                className="inline-block w-full px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors"
              >
                Upgrade to Premium
              </a>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-3">Starting at $1.99/month</p>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-white dark:from-[var(--dark)] to-transparent pointer-events-none" />
        </div>
      </div>
    )
  }

  const { dateFrom: rawFrom, dateTo: rawTo } = await searchParams
  const dateFrom = rawFrom && ISO_DATE.test(rawFrom) ? rawFrom : undefined
  const dateTo = rawTo && ISO_DATE.test(rawTo) ? rawTo : undefined

  const allProjects = await getUserProjects(user.id)

  let data: Awaited<ReturnType<typeof getEarningsReport>> | null = null
  let fetchError: string | null = null

  try {
    data = await getEarningsReport(user.id, dateFrom, dateTo)
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Failed to load earnings'
  }

  if (fetchError || !data) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-end">
          <Suspense fallback={<div className="h-8" />}>
            <EarningsFilters />
          </Suspense>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <DollarSign className="h-12 w-12 text-amber-400" />
          <div>
            <p className="text-base font-medium text-stone-700 dark:text-stone-300">Unable to load earnings</p>
            <p className="text-sm text-stone-400 dark:text-stone-500 mt-1">{fetchError ?? 'Try again later'}</p>
          </div>
        </div>
      </div>
    )
  }

  const avgRate = data.projects.length > 0
    ? data.projects.reduce((s, p) => s + p.rate, 0) / data.projects.length
    : 0

  const currencySymbol = { USD: '$', EUR: '\u20AC', GBP: '\u00A3', JPY: '\u00A5', CAD: 'C$', AUD: 'A$', CHF: 'CHF', INR: '\u20B9', BRL: 'R$', SEK: 'kr' }[data.currency] ?? data.currency

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-end">
        <Suspense fallback={<div className="h-8" />}>
          <EarningsFilters />
        </Suspense>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-stone-500 dark:text-stone-400">Grand Total</span>
            </div>
            <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{currencySymbol}{data.grand_total.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              <span className="text-xs text-stone-500 dark:text-stone-400">Avg Rate</span>
            </div>
            <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{currencySymbol}{avgRate.toFixed(0)}/hr</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-stone-500 dark:text-stone-400">Total Hours</span>
            </div>
            <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{data.total_hours.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <FolderKanban className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-stone-500 dark:text-stone-400">Projects</span>
            </div>
            <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{data.total_projects}</p>
          </CardContent>
        </Card>
      </div>

      <EarningsChart data={data.daily_earnings ?? []} currencySymbol={currencySymbol} />

      <EarningsView data={data} />

      <EarningsProjectsManager
        projects={allProjects.map(p => ({
          id: p.id,
          name: p.name,
          color: p.color,
          hourly_rate: p.hourly_rate,
          earnings_enabled: p.earnings_enabled as boolean,
        }))}
        currency={currencySymbol}
      />
    </div>
  )
}
