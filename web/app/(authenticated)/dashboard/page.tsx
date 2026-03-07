import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { requireAuth } from '@/lib/services/auth'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard')
  return { title: t('title') }
}
import { getDashboardBootstrapData } from '@/lib/repositories/dashboard'
import DashboardTabs from './DashboardTabs'

function getWeekRange(weekStartDay: 0 | 1): { dateFrom: string; dateTo: string } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayOfWeek = today.getDay()
  const diff = (dayOfWeek - weekStartDay + 7) % 7
  const start = new Date(today)
  start.setDate(today.getDate() - diff)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  // Use local date (NOT toISOString which gives UTC and can shift the day)
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { dateFrom: fmt(start), dateTo: fmt(end) }
}

export default async function DashboardPage() {
  const user = await requireAuth()

  // Pre-compute a wide date range that covers any weekStartDay (0=Sun or 1=Mon)
  // plus 1 extra day for midnight-crossing entries.
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const wideFrom = new Date(today)
  wideFrom.setDate(today.getDate() - 8) // 7 days + 1 midnight buffer
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  // Optimized single RPC call replacing 8 separate calls
  const data = await getDashboardBootstrapData(user.id, fmt(wideFrom), fmt(today))

  const {
    subscription,
    cursors,
    recent_entries,
    projects,
    tags,
    stats,
    settings,
    week_entries
  } = data

  const weekStartDay = settings?.week_start_day ?? 1
  const workingDays = settings?.working_days ?? 5
  const { dateFrom, dateTo } = getWeekRange(weekStartDay)

  // Filter pre-fetched wide range to the exact week range (including midnight buffer)
  const fetchFrom = new Date(dateFrom + 'T00:00:00')
  fetchFrom.setDate(fetchFrom.getDate() - 1)
  const weekFromStr = fmt(fetchFrom)
  const weekEntries = week_entries.filter(
    e => e.date >= weekFromStr && e.date <= dateTo
  )

  const isPremium = subscription?.plan !== 'free' && subscription?.status === 'active'

  return (
    <DashboardTabs
      subscription={subscription}
      cursors={cursors ?? []}
      recentEntries={recent_entries}
      weekEntries={weekEntries}
      projects={projects}
      tags={tags}
      stats={stats}
      isPremium={isPremium}
      userEmail={user.email ?? ''}
      defaultHourlyRate={settings?.default_hourly_rate ?? null}
      currency={settings?.currency ?? 'USD'}
      weekStartDay={weekStartDay}
      workingDays={workingDays}
    />
  )
}
