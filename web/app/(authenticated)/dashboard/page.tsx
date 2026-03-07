import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { requireAuth } from '@/lib/services/auth'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard')
  return { title: t('title') }
}
import { getUserSubscription } from '@/lib/repositories/subscriptions'
import { getUserSyncCursors } from '@/lib/repositories/syncCursors'
import { getUserTimeEntries } from '@/lib/repositories/timeEntries'
import { getUserProjects } from '@/lib/repositories/projects'
import { getUserTags } from '@/lib/repositories/tags'
import { getUserStats } from '@/lib/repositories/userStats'
import { getUserSettings } from '@/lib/repositories/userSettings'
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
  // plus 1 extra day for midnight-crossing entries. This eliminates the sequential
  // waterfall that previously waited for settings before fetching week entries.
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const wideFrom = new Date(today)
  wideFrom.setDate(today.getDate() - 8) // 7 days + 1 midnight buffer
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  // Single parallel fetch — no sequential waterfall
  const [{ data: subscription }, cursors, entriesPage, projects, tags, stats, settings, weekEntriesPage] =
    await Promise.all([
      getUserSubscription(user.id),
      getUserSyncCursors(user.id),
      getUserTimeEntries(user.id, { pageSize: 10 }),
      getUserProjects(user.id),
      getUserTags(user.id),
      getUserStats(user.id),
      getUserSettings(user.id),
      getUserTimeEntries(user.id, {
        dateFrom: fmt(wideFrom),
        dateTo: fmt(today),
        pageSize: 200,
      }),
    ])

  const weekStartDay = settings?.week_start_day ?? 1
  const workingDays = settings?.working_days ?? 5 // Mon-Fri default (count, not bitmask)
  const { dateFrom, dateTo } = getWeekRange(weekStartDay)

  // Filter pre-fetched wide range to the exact week range (including midnight buffer)
  const fetchFrom = new Date(dateFrom + 'T00:00:00')
  fetchFrom.setDate(fetchFrom.getDate() - 1)
  const weekFromStr = fmt(fetchFrom)
  const weekEntries = weekEntriesPage.data.filter(
    e => e.date >= weekFromStr && e.date <= dateTo
  )

  const isPremium = subscription?.plan !== 'free' && subscription?.status === 'active'

  return (
    <DashboardTabs
      subscription={subscription}
      cursors={cursors ?? []}
      recentEntries={entriesPage.data}
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
