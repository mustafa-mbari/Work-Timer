import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Clock, FileText, TrendingUp, Flame, CalendarDays, Timer, FolderKanban,
} from 'lucide-react'
import AnalyticsCharts from './AnalyticsCharts'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Check premium status
  const serviceSupabase = await createServiceClient()
  const { data: subscription } = await (serviceSupabase.from('subscriptions') as any)
    .select('plan, status')
    .eq('user_id', user.id)
    .single()

  const isPremium = subscription?.plan !== 'free' && subscription?.status === 'active'

  if (!isPremium) {
    redirect('/billing')
  }

  // Fetch analytics data — use .range() to bypass PostgREST default 1000 row limit
  const [{ data: entries }, { data: projects }] = await Promise.all([
    (supabase.from('time_entries') as any)
      .select('date, start_time, end_time, duration, project_id, type, tags, description')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .range(0, 49999),
    (supabase.from('projects') as any)
      .select('id, name, color, target_hours')
      .eq('user_id', user.id)
      .is('deleted_at', null),
  ])

  // === Overview metrics ===
  const totalHours = entries?.reduce((sum: number, e: any) => sum + (e.duration / 3600000), 0) || 0
  const totalEntries = entries?.length || 0
  const uniqueDays = new Set(entries?.map((e: any) => e.date)).size
  const avgPerDay = uniqueDays > 0 ? totalHours / uniqueDays : 0

  // Average session duration
  const avgSessionMs = totalEntries > 0
    ? entries.reduce((sum: number, e: any) => sum + e.duration, 0) / totalEntries
    : 0
  const avgSessionMin = Math.round(avgSessionMs / 60000)

  // Streak (consecutive days with entries, counting back from today)
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const allDates: string[] = entries?.map((e: any) => e.date as string) || []
  const sortedDates = [...new Set(allDates)].sort().reverse()
  let streak = 0
  const checkDate = new Date(today)

  // If no entries today, check if yesterday starts a streak
  if (sortedDates[0] !== todayStr) {
    checkDate.setDate(checkDate.getDate() - 1)
  }

  for (const date of sortedDates) {
    const expected = checkDate.toISOString().split('T')[0]
    if (date === expected) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else if (date < expected) {
      break
    }
  }

  // === Group by project ===
  const projectStats: { name: string; color: string; hours: number; entries: number; targetHours: number | null }[] =
    (projects || []).map((p: any) => {
      const projectEntries = entries?.filter((e: any) => e.project_id === p.id) || []
      const hours = projectEntries.reduce((sum: number, e: any) => sum + (e.duration / 3600000), 0)
      return {
        name: p.name as string,
        color: p.color as string,
        hours: Number(hours.toFixed(1)),
        entries: projectEntries.length,
        targetHours: p.target_hours as number | null,
      }
    })
  projectStats.sort((a, b) => b.hours - a.hours)

  // === Group by week (last 12 weeks) ===
  const weeklyStats: Record<string, number> = {}
  entries?.forEach((e: any) => {
    const date = new Date(e.date)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    const weekKey = weekStart.toISOString().split('T')[0]
    weeklyStats[weekKey] = (weeklyStats[weekKey] || 0) + (e.duration / 3600000)
  })

  const weeklyData = Object.entries(weeklyStats)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([week, hours]) => ({
      week: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      hours: Number(hours.toFixed(1)),
    }))

  // === Group by type ===
  const typeData = [
    { name: 'Manual', hours: 0, count: 0, fill: '#6366f1' },
    { name: 'Stopwatch', hours: 0, count: 0, fill: '#10b981' },
    { name: 'Pomodoro', hours: 0, count: 0, fill: '#a855f7' },
  ]
  entries?.forEach((e: any) => {
    const idx = e.type === 'manual' ? 0 : e.type === 'stopwatch' ? 1 : 2
    typeData[idx].hours += e.duration / 3600000
    typeData[idx].count++
  })
  typeData.forEach(d => { d.hours = Number(d.hours.toFixed(1)) })

  // === Daily trend (last 30 days) ===
  const dailyStats: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    dailyStats[d.toISOString().split('T')[0]] = 0
  }
  entries?.forEach((e: any) => {
    if (e.date in dailyStats) {
      dailyStats[e.date] += e.duration / 3600000
    }
  })
  const dailyData = Object.entries(dailyStats).map(([date, hours]) => ({
    date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    hours: Number(hours.toFixed(1)),
  }))

  // === Day of week breakdown ===
  const dayOfWeekLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dayOfWeekData = dayOfWeekLabels.map((name) => ({ name, hours: 0 }))
  entries?.forEach((e: any) => {
    const dayIdx = new Date(e.date).getDay()
    dayOfWeekData[dayIdx].hours += e.duration / 3600000
  })
  dayOfWeekData.forEach(d => { d.hours = Number(d.hours.toFixed(1)) })

  // === Peak hours (what hours of day entries start) ===
  const hourBuckets = Array.from({ length: 24 }, (_, i) => ({ hour: `${i.toString().padStart(2, '0')}:00`, count: 0 }))
  entries?.forEach((e: any) => {
    if (e.start_time) {
      const h = new Date(e.start_time).getHours()
      hourBuckets[h].count++
    }
  })

  // === Project progress (for projects with target hours) ===
  const projectProgress = projectStats
    .filter(p => p.targetHours && p.targetHours > 0)
    .map(p => ({
      name: p.name,
      color: p.color,
      current: p.hours,
      target: p.targetHours!,
      pct: Math.min(100, (p.hours / p.targetHours!) * 100),
    }))

  // Most productive day
  const bestDay = dayOfWeekData.reduce((best, d) => d.hours > best.hours ? d : best, dayOfWeekData[0])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Analytics & Reports</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Advanced insights into your time tracking</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-indigo-500" />
              <span className="text-xs text-stone-500 dark:text-stone-400">Total Hours</span>
            </div>
            <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{totalHours.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-stone-500 dark:text-stone-400">Total Entries</span>
            </div>
            <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{totalEntries}</p>
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
            <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{streak}d</p>
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
        weeklyData={weeklyData}
        dailyData={dailyData}
        projectStats={projectStats}
        typeData={typeData}
        dayOfWeekData={dayOfWeekData}
        peakHoursData={hourBuckets}
      />
    </div>
  )
}
