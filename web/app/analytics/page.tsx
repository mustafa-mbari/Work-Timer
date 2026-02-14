import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

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

  // Fetch analytics data
  const { data: entries } = await (supabase.from('time_entries') as any)
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(1000)

  const { data: projects } = await (supabase.from('projects') as any)
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)

  // Calculate metrics
  const totalHours = entries?.reduce((sum: number, e: any) => sum + (e.duration / 3600000), 0) || 0
  const totalEntries = entries?.length || 0
  const avgPerDay = totalEntries > 0 ? (totalHours / Math.max(1, new Set(entries?.map((e: any) => e.date)).size)) : 0

  // Group by project
  const projectStats = projects?.map((p: any) => {
    const projectEntries = entries?.filter((e: any) => e.project_id === p.id) || []
    const hours = projectEntries.reduce((sum: number, e: any) => sum + (e.duration / 3600000), 0)
    return { name: p.name, color: p.color, hours, entries: projectEntries.length }
  }).sort((a: any, b: any) => b.hours - a.hours) || []

  // Group by week
  const weeklyStats: Record<string, number> = {}
  entries?.forEach((e: any) => {
    const date = new Date(e.date)
    const weekStart = new Date(date.setDate(date.getDate() - date.getDay()))
    const weekKey = weekStart.toISOString().split('T')[0]
    weeklyStats[weekKey] = (weeklyStats[weekKey] || 0) + (e.duration / 3600000)
  })

  const weeklyData = Object.entries(weeklyStats)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([week, hours]) => ({ week, hours: Number(hours.toFixed(1)) }))

  // Group by type
  const typeStats = {
    manual: 0,
    stopwatch: 0,
    pomodoro: 0,
  }
  entries?.forEach((e: any) => {
    if (e.type in typeStats) {
      typeStats[e.type as keyof typeof typeStats] += e.duration / 3600000
    }
  })

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-stone-900">Analytics & Reports</h1>
          <p className="text-sm text-stone-500 mt-1">Advanced insights into your time tracking</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <div className="text-sm text-stone-500 mb-1">Total Hours Tracked</div>
            <div className="text-3xl font-bold text-stone-900">{totalHours.toFixed(1)}</div>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <div className="text-sm text-stone-500 mb-1">Total Entries</div>
            <div className="text-3xl font-bold text-stone-900">{totalEntries}</div>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <div className="text-sm text-stone-500 mb-1">Avg Hours/Day</div>
            <div className="text-3xl font-bold text-stone-900">{avgPerDay.toFixed(1)}</div>
          </div>
        </div>

        {/* Weekly Trend */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">Weekly Hours (Last 12 Weeks)</h2>
          <div className="space-y-2">
            {weeklyData.map(({ week, hours }) => (
              <div key={week} className="flex items-center gap-3">
                <div className="text-xs text-stone-500 w-20">{new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                <div className="flex-1 bg-stone-100 rounded-full h-6 relative">
                  <div
                    className="bg-indigo-500 h-6 rounded-full flex items-center justify-end px-2"
                    style={{ width: `${Math.min(100, (hours / Math.max(...weeklyData.map(w => w.hours))) * 100)}%` }}
                  >
                    <span className="text-xs font-medium text-white">{hours}h</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Project Breakdown */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Time by Project</h2>
            <div className="space-y-3">
              {projectStats.slice(0, 10).map((p: any) => (
                <div key={p.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }}></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-stone-900 truncate">{p.name}</div>
                    <div className="text-xs text-stone-500">{p.entries} entries</div>
                  </div>
                  <div className="text-sm font-semibold text-stone-700">{p.hours.toFixed(1)}h</div>
                </div>
              ))}
              {projectStats.length === 0 && (
                <div className="text-sm text-stone-400 text-center py-4">No project data yet</div>
              )}
            </div>
          </div>

          {/* Entry Type Distribution */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Time by Entry Type</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-stone-900">Manual</div>
                </div>
                <div className="text-sm font-semibold text-stone-700">{typeStats.manual.toFixed(1)}h</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-stone-900">Stopwatch</div>
                </div>
                <div className="text-sm font-semibold text-stone-700">{typeStats.stopwatch.toFixed(1)}h</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-purple-500 shrink-0"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-stone-900">Pomodoro</div>
                </div>
                <div className="text-sm font-semibold text-stone-700">{typeStats.pomodoro.toFixed(1)}h</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
