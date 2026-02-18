import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Clock, FileText, TrendingUp, Flame, CalendarDays, Timer, FolderKanban, BarChart2,
} from 'lucide-react'
import AnalyticsCharts from './AnalyticsCharts'
import AnalyticsFilters from './AnalyticsFilters'
import { requireAuth } from '@/lib/services/auth'
import { isPremiumUser } from '@/lib/services/billing'
import { getUserAnalytics } from '@/lib/services/analytics'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string }>
}) {
  const user = await requireAuth()

  if (!(await isPremiumUser(user.id))) {
    redirect('/billing')
  }

  const { dateFrom: rawFrom, dateTo: rawTo } = await searchParams
  const dateFrom = rawFrom && ISO_DATE.test(rawFrom) ? rawFrom : undefined
  const dateTo   = rawTo   && ISO_DATE.test(rawTo)   ? rawTo   : undefined

  const data = await getUserAnalytics(user.id, dateFrom, dateTo)

  const isFiltered = dateFrom || dateTo

  // Full-page empty state when there are no entries at all
  if (data.total_entries === 0 && !isFiltered) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Analytics & Reports</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Advanced insights into your time tracking</p>
          </div>
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
  const avgSessionMin = Math.round(data.avg_session_ms / 60000)

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Analytics & Reports</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Advanced insights into your time tracking</p>
        </div>
        <AnalyticsFilters />
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
                <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{data.total_hours.toFixed(1)}</p>
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
                <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{data.streak}d</p>
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
