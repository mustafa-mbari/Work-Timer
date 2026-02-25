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

  const [{ data: subscription }, cursors, entriesPage, projects, tags, stats, settings] = await Promise.all([
    getUserSubscription(user.id),
    getUserSyncCursors(user.id),
    getUserTimeEntries(user.id, { pageSize: 10 }),
    getUserProjects(user.id),
    getUserTags(user.id),
    getUserStats(user.id),
    getUserSettings(user.id),
  ])

  const weekStartDay = settings?.week_start_day ?? 1
  const workingDays = settings?.working_days ?? 0b0111110 // Mon-Fri default
  const { dateFrom, dateTo } = getWeekRange(weekStartDay)

  // Fetch 1 day before week start to catch entries that cross midnight into the week
  const fetchFrom = new Date(dateFrom + 'T00:00:00')
  fetchFrom.setDate(fetchFrom.getDate() - 1)
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const weekEntriesPage = await getUserTimeEntries(user.id, {
    dateFrom: fmt(fetchFrom),
    dateTo,
    pageSize: 500,
  })

  const isPremium = subscription?.plan !== 'free' && subscription?.status === 'active'

  return (
    <DashboardTabs
      subscription={subscription}
      cursors={cursors ?? []}
      recentEntries={entriesPage.data}
      weekEntries={weekEntriesPage.data}
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
