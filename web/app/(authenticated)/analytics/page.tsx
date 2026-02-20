import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Clock, FileText, TrendingUp, Flame, CalendarDays, Timer, FolderKanban, BarChart2, AlertTriangle, Lock,
} from 'lucide-react'
import AnalyticsCharts from './AnalyticsCharts'
import AnalyticsFilters from './AnalyticsFilters'
import { requireAuth } from '@/lib/services/auth'
import { isPremiumUser } from '@/lib/services/billing'
import { getUserAnalytics } from '@/lib/services/analytics'

// Static preview data shown (blurred) to free users
const PREVIEW_DATA = {
  total_hours: 127.5, total_entries: 89, unique_days: 22,
  avg_session_ms: 5760000, streak: 7,
  day_of_week_data: [
    { name: 'Mon', hours: 6.5 }, { name: 'Tue', hours: 7.2 }, { name: 'Wed', hours: 5.8 },
    { name: 'Thu', hours: 8.1 }, { name: 'Fri', hours: 6.9 }, { name: 'Sat', hours: 2.1 }, { name: 'Sun', hours: 1.4 },
  ],
  weekly_data: [
    { week: 'W1', hours: 32 }, { week: 'W2', hours: 28 }, { week: 'W3', hours: 35 },
    { week: 'W4', hours: 30 }, { week: 'W5', hours: 38 }, { week: 'W6', hours: 25 },
    { week: 'W7', hours: 42 }, { week: 'W8', hours: 36 }, { week: 'W9', hours: 29 },
    { week: 'W10', hours: 33 }, { week: 'W11', hours: 40 }, { week: 'W12', hours: 27 },
  ],
  daily_data: [
    4.5, 6.2, 5.0, 7.8, 6.5, 3.2, 1.5, 5.9, 7.1, 6.8,
    8.2, 5.5, 4.9, 7.3, 6.0, 2.8, 1.2, 6.7, 7.9, 5.4,
    4.1, 6.3, 8.0, 7.2, 5.6, 3.9, 2.0, 6.1, 7.5, 5.8,
  ].map((hours, i) => ({ date: `Day ${i + 1}`, hours })),
  project_stats: [
    { name: 'Frontend', color: '#6366f1', hours: 48.5, entries: 32 },
    { name: 'Backend',  color: '#10b981', hours: 35.2, entries: 24 },
    { name: 'Design',   color: '#f59e0b', hours: 22.8, entries: 18 },
    { name: 'Meetings', color: '#ef4444', hours: 15.0, entries: 10 },
    { name: 'Planning', color: '#8b5cf6', hours: 6.0,  entries:  5 },
  ],
  type_data: [
    { name: 'Stopwatch', hours: 87.3, count: 62, fill: '#10b981' },
    { name: 'Manual',    hours: 28.4, count: 20, fill: '#6366f1' },
    { name: 'Pomodoro',  hours: 11.8, count:  7, fill: '#a855f7' },
  ],
  peak_hours_data: [
    { hour: '8am', count: 12 }, { hour: '9am', count: 18 }, { hour: '10am', count: 22 },
    { hour: '11am', count: 20 }, { hour: '12pm', count: 8  }, { hour: '1pm',  count: 10 },
    { hour: '2pm',  count: 19 }, { hour: '3pm',  count: 21 }, { hour: '4pm',  count: 15 },
    { hour: '5pm',  count:  9 }, { hour: '6pm',  count:  5 }, { hour: '7pm',  count:  3 },
  ],
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const HEADER = (
  <div>
    <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Analytics & Reports</h1>
    <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Advanced insights into your time tracking</p>
  </div>
)

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string }>
}) {
  const user = await requireAuth()

  const premium = await isPremiumUser(user.id)

  // Free users see a blurred preview with an upgrade prompt
  if (!premium) {
    const p = PREVIEW_DATA
    const avgPerDay = p.total_hours / p.unique_days
    const avgSessionMin = Math.round(p.avg_session_ms / 60000)
    const bestDay = p.day_of_week_data.reduce((b, d) => d.hours > b.hours ? d : b)
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {HEADER}
        </div>
        {/* Blurred preview + overlay */}
        <div className="relative">
          <div className="blur-sm pointer-events-none select-none opacity-55 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { icon: <Clock className="h-4 w-4 text-indigo-500" />,   label: 'Total Hours',   value: p.total_hours.toFixed(1) },
                { icon: <FileText className="h-4 w-4 text-emerald-500" />, label: 'Total Entries', value: p.total_entries },
                { icon: <TrendingUp className="h-4 w-4 text-amber-500" />, label: 'Avg Hours/Day', value: avgPerDay.toFixed(1) },
                { icon: <Timer className="h-4 w-4 text-purple-500" />,    label: 'Avg Session',   value: `${avgSessionMin}m` },
                { icon: <Flame className="h-4 w-4 text-rose-500" />,      label: 'Streak',        value: `${p.streak}d` },
                { icon: <CalendarDays className="h-4 w-4 text-sky-500" />, label: 'Best Day',     value: bestDay.name },
              ].map(({ icon, label, value }) => (
                <Card key={label}><CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs text-stone-500">{label}</span></div>
                  <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{value}</p>
                </CardContent></Card>
              ))}
            </div>
            <AnalyticsCharts
              weeklyData={p.weekly_data}
              dailyData={p.daily_data}
              projectStats={p.project_stats}
              typeData={p.type_data}
              dayOfWeekData={p.day_of_week_data}
              peakHoursData={p.peak_hours_data}
            />
          </div>

          {/* Upgrade overlay */}
          <div className="absolute inset-x-0 top-12 flex justify-center z-10 px-4">
            <div className="bg-white/95 dark:bg-[var(--dark-card)]/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-stone-200 dark:border-[var(--dark-border)] p-8 text-center max-w-md w-full">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mx-auto mb-4">
                <Lock className="h-7 w-7 text-indigo-500 dark:text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">Unlock Analytics</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">
                See your productivity trends, project breakdowns, peak working hours, streaks and more — with Premium.
              </p>
              <a
                href="/billing"
                className="inline-block w-full px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors"
              >
                Upgrade to Premium
              </a>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-3">Starting at $1.99 / month</p>
            </div>
          </div>

          {/* Fade-out gradient at the bottom so the page doesn't look cut off */}
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-white dark:from-[var(--dark)] to-transparent pointer-events-none" />
        </div>
      </div>
    )
  }

  const { dateFrom: rawFrom, dateTo: rawTo } = await searchParams
  const dateFrom = rawFrom && ISO_DATE.test(rawFrom) ? rawFrom : undefined
  const dateTo   = rawTo   && ISO_DATE.test(rawTo)   ? rawTo   : undefined

  let data: Awaited<ReturnType<typeof getUserAnalytics>> | null = null
  let fetchError: string | null = null

  try {
    data = await getUserAnalytics(user.id, dateFrom, dateTo)
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Failed to load analytics'
  }

  const isFiltered = dateFrom || dateTo

  // Error state
  if (fetchError || !data) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {HEADER}
          <Suspense fallback={<div className="h-8" />}>
            <AnalyticsFilters />
          </Suspense>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <AlertTriangle className="h-12 w-12 text-amber-400" />
          <div>
            <p className="text-base font-medium text-stone-700 dark:text-stone-300">Could not load analytics</p>
            <p className="text-sm text-stone-400 dark:text-stone-500 mt-1">
              {fetchError ?? 'An unexpected error occurred. Please try refreshing.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Full-page empty state when there are no entries at all
  if (data.total_entries === 0 && !isFiltered) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {HEADER}
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <BarChart2 className="h-12 w-12 text-stone-300 dark:text-stone-600" />
          <div>
            <p className="text-base font-medium text-stone-700 dark:text-stone-300">No data yet</p>
            <p className="text-sm text-stone-400 dark:text-stone-500 mt-1">
              Start tracking time in the extension to see your analytics here.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const avgPerDay = data.unique_days > 0 ? data.total_hours / data.unique_days : 0
  const avgSessionMin = Math.round((data.avg_session_ms ?? 0) / 60000)

  // Find best day
  const dayOfWeekData = data.day_of_week_data ?? []
  const bestDay = dayOfWeekData.reduce(
    (best, d) => d.hours > best.hours ? d : best,
    dayOfWeekData[0] ?? { name: 'N/A', hours: 0 }
  )

  // Project progress (for projects with target hours)
  const projectStats = data.project_stats ?? []
  const projectProgress = projectStats
    .filter(p => p.target_hours && p.target_hours > 0)
    .map(p => ({
      name: p.name,
      color: p.color,
      current: p.hours,
      target: p.target_hours!,
      pct: Math.min(100, (p.hours / p.target_hours!) * 100),
    }))

  // Type data with fill colors
  const typeData = (data.type_data ?? []).map(t => ({
    ...t,
    fill: t.name === 'Manual' ? '#6366f1' : t.name === 'Stopwatch' ? '#10b981' : '#a855f7',
  }))

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {HEADER}
        <Suspense fallback={<div className="h-8" />}>
          <AnalyticsFilters />
        </Suspense>
      </div>

      {/* Empty state when filter returns no results */}
      {data.total_entries === 0 && isFiltered && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <BarChart2 className="h-10 w-10 text-stone-300 dark:text-stone-600" />
          <p className="text-sm text-stone-500 dark:text-stone-400">
            No entries found for the selected date range.
          </p>
        </div>
      )}

      {data.total_entries > 0 && (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs text-stone-500 dark:text-stone-400">Total Hours</span>
                </div>
                <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{(data.total_hours ?? 0).toFixed(1)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs text-stone-500 dark:text-stone-400">Total Entries</span>
                </div>
                <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{data.total_entries}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-stone-500 dark:text-stone-400">Avg Hours/Day</span>
                </div>
                <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{avgPerDay.toFixed(1)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Timer className="h-4 w-4 text-purple-500" />
                  <span className="text-xs text-stone-500 dark:text-stone-400">Avg Session</span>
                </div>
                <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{avgSessionMin}m</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="h-4 w-4 text-rose-500" />
                  <span className="text-xs text-stone-500 dark:text-stone-400">Streak</span>
                </div>
                <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{data.streak ?? 0}d</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarDays className="h-4 w-4 text-sky-500" />
                  <span className="text-xs text-stone-500 dark:text-stone-400">Best Day</span>
                </div>
                <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{bestDay.name}</p>
              </CardContent>
            </Card>
          </div>

          {/* Project Progress (if any have targets) */}
          {projectProgress.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderKanban className="h-5 w-5 text-indigo-500" />
                  Project Progress
                </CardTitle>
                <CardDescription>Hours tracked vs target goals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {projectProgress.map(p => (
                    <div key={p.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="text-sm font-medium text-stone-900 dark:text-stone-100">{p.name}</span>
                        </div>
                        <span className="text-sm text-stone-500 dark:text-stone-400">
                          {p.current}h / {p.target}h
                          <Badge variant={p.pct >= 100 ? 'default' : 'secondary'} className="ml-2">
                            {p.pct.toFixed(0)}%
                          </Badge>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-stone-200 dark:bg-[var(--dark-elevated)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${p.pct}%`,
                            backgroundColor: p.pct >= 100 ? '#10b981' : p.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts (client component for Recharts) */}
          <AnalyticsCharts
            weeklyData={data.weekly_data ?? []}
            dailyData={data.daily_data ?? []}
            projectStats={projectStats}
            typeData={typeData}
            dayOfWeekData={dayOfWeekData}
            peakHoursData={data.peak_hours_data ?? []}
            isFiltered={!!isFiltered}
          />
        </>
      )}
    </div>
  )
}
