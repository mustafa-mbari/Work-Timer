import { createServiceClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Users, Activity, TrendingUp, Clock, FileText, Percent,
  Crown, CreditCard, Globe, Ticket, UserCheck, CalendarDays,
  FolderKanban,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub }: {
  icon: any; iconBg: string; iconColor: string; label: string; value: string | number; sub?: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-stone-500 dark:text-stone-400 truncate">{label}</p>
            <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{value}</p>
            {sub && <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function BreakdownRow({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-stone-600 dark:text-stone-300">{label}</span>
          <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">{value}</span>
        </div>
        <div className="h-1.5 rounded-full bg-stone-200 dark:bg-[var(--dark-elevated)] overflow-hidden">
          <div
            className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export default async function AdminStatsPage() {
  const supabase = await createServiceClient()

  const now = new Date()
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgoDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Use auth.admin for accurate user count, profiles for email/created_at data
  const [
    { data: { users: authUsers } },
    { data: allProfiles },
    { data: subscriptions },
    { data: promoCodes },
    { data: domains },
    { data: allEntries },
    { data: dauData },
    { data: wauData },
    { data: mauData },
    { data: recentEntries },
    { data: allProjects },
  ] = await Promise.all([
    supabase.auth.admin.listUsers({ perPage: 10000 }),
    (supabase.from('profiles') as any).select('id, email, created_at').range(0, 49999),
    (supabase.from('subscriptions') as any).select('user_id, plan, status, granted_by, created_at').range(0, 49999),
    (supabase.from('promo_codes') as any).select('code, current_uses, max_uses, active').range(0, 49999),
    (supabase.from('whitelisted_domains') as any).select('domain, active').range(0, 49999),
    (supabase.from('time_entries') as any).select('user_id, duration, date, type, created_at').is('deleted_at', null).range(0, 49999),
    (supabase.from('time_entries') as any).select('user_id').is('deleted_at', null).gte('created_at', dayAgo).range(0, 49999),
    (supabase.from('time_entries') as any).select('user_id').is('deleted_at', null).gte('created_at', weekAgo).range(0, 49999),
    (supabase.from('time_entries') as any).select('user_id').is('deleted_at', null).gte('created_at', monthAgo).range(0, 49999),
    (supabase.from('time_entries') as any).select('id').is('deleted_at', null).gte('date', thirtyDaysAgoDate).range(0, 49999),
    (supabase.from('projects') as any).select('id, user_id').is('deleted_at', null).range(0, 49999),
  ])

  const userCount = authUsers?.length ?? 0
  const dau = new Set(dauData?.map((e: any) => e.user_id)).size
  const wau = new Set(wauData?.map((e: any) => e.user_id)).size
  const mau = new Set(mauData?.map((e: any) => e.user_id)).size
  const entryCount = allEntries?.length ?? 0
  const totalHours = allEntries?.reduce((sum: number, e: any) => sum + (e.duration / 3600000), 0) || 0
  const avgEntriesPerUser = userCount > 0 ? (entryCount / userCount).toFixed(1) : '0'
  const avgHoursPerUser = userCount > 0 ? (totalHours / userCount).toFixed(1) : '0'
  const recentCount = recentEntries?.length ?? 0
  const avgEntriesPerDay = recentCount > 0 ? (recentCount / 30).toFixed(1) : '0'
  const newUsersThisWeek = authUsers?.filter((u: any) => {
    const created = new Date(u.created_at)
    return created >= new Date(weekAgo)
  }).length ?? 0
  const projectCount = allProjects?.length ?? 0

  // Premium breakdown
  const premiumSubs = subscriptions?.filter((s: any) => s.plan !== 'free' && s.status === 'active') || []
  const premiumCount = premiumSubs.length
  const premiumByType = {
    monthly: premiumSubs.filter((s: any) => s.plan === 'premium_monthly').length,
    yearly: premiumSubs.filter((s: any) => s.plan === 'premium_yearly').length,
    lifetime: premiumSubs.filter((s: any) => s.plan === 'premium_lifetime').length,
  }
  const premiumBySource = {
    stripe: premiumSubs.filter((s: any) => s.granted_by === 'stripe').length,
    domain: premiumSubs.filter((s: any) => s.granted_by === 'domain').length,
    promo: premiumSubs.filter((s: any) => s.granted_by === 'promo').length,
    manual: premiumSubs.filter((s: any) => s.granted_by === 'admin_manual').length,
  }

  const activePromos = promoCodes?.filter((p: any) => p.active).length || 0
  const totalPromoUses = promoCodes?.reduce((sum: number, p: any) => sum + p.current_uses, 0) || 0
  const activeDomains = domains?.filter((d: any) => d.active).length || 0
  const conversionRate = userCount > 0 ? ((premiumCount / userCount) * 100).toFixed(1) : '0'

  // Entry type breakdown
  const entryByType = {
    manual: allEntries?.filter((e: any) => e.type === 'manual').length || 0,
    stopwatch: allEntries?.filter((e: any) => e.type === 'stopwatch').length || 0,
    pomodoro: allEntries?.filter((e: any) => e.type === 'pomodoro').length || 0,
  }

  // User growth (signups per week for last 8 weeks) — use auth users for accurate counts
  const userGrowth: { week: string; count: number }[] = []
  for (let i = 7; i >= 0; i--) {
    const wStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
    const wEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
    const count = authUsers?.filter((u: any) => {
      const d = new Date(u.created_at)
      return d >= wStart && d < wEnd
    }).length || 0
    userGrowth.push({
      week: wStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count,
    })
  }

  // Top users by hours
  const userHours: Record<string, number> = {}
  allEntries?.forEach((e: any) => {
    userHours[e.user_id] = (userHours[e.user_id] || 0) + (e.duration / 3600000)
  })
  const topUsersById = Object.entries(userHours)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
  const topUsers = topUsersById.map(([userId, hours]) => {
    const authUser = authUsers?.find((u: any) => u.id === userId)
    const profile = allProfiles?.find((p: any) => p.id === userId)
    return {
      email: authUser?.email || profile?.email || 'Unknown',
      hours: Number(hours.toFixed(1)),
    }
  })

  // Avg session duration
  const avgSessionMs = entryCount > 0
    ? allEntries.reduce((sum: number, e: any) => sum + e.duration, 0) / entryCount
    : 0
  const avgSessionMin = Math.round(avgSessionMs / 60000)

  // Projects per user
  const avgProjectsPerUser = userCount > 0 ? (projectCount / userCount).toFixed(1) : '0'

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Global Statistics</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Platform-wide metrics and engagement</p>
      </div>

      {/* User Metrics */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-3 flex items-center gap-2">
          <Users className="h-4 w-4" /> Users
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Users} iconBg="bg-indigo-100 dark:bg-indigo-900/30" iconColor="text-indigo-600 dark:text-indigo-400"
            label="Total Users" value={userCount} sub={`+${newUsersThisWeek} this week`}
          />
          <StatCard
            icon={Activity} iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600 dark:text-emerald-400"
            label="DAU" value={dau} sub="Daily active"
          />
          <StatCard
            icon={TrendingUp} iconBg="bg-amber-100 dark:bg-amber-900/30" iconColor="text-amber-600 dark:text-amber-400"
            label="WAU" value={wau} sub="Weekly active"
          />
          <StatCard
            icon={UserCheck} iconBg="bg-purple-100 dark:bg-purple-900/30" iconColor="text-purple-600 dark:text-purple-400"
            label="MAU" value={mau} sub="Monthly active"
          />
        </div>
      </div>

      {/* User Growth */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-3 flex items-center gap-2">
          <CalendarDays className="h-4 w-4" /> User Growth (Last 8 Weeks)
        </h3>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-end gap-2 h-32">
              {userGrowth.map((w, i) => {
                const maxCount = Math.max(...userGrowth.map(x => x.count), 1)
                const heightPct = (w.count / maxCount) * 100
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-stone-900 dark:text-stone-100">{w.count}</span>
                    <div className="w-full flex flex-col justify-end" style={{ height: '80px' }}>
                      <div
                        className="w-full bg-indigo-500 dark:bg-indigo-400 rounded-t-md transition-all min-h-[4px]"
                        style={{ height: `${Math.max(heightPct, 5)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-stone-500 dark:text-stone-400 truncate w-full text-center">{w.week}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Premium Breakdown */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-3 flex items-center gap-2">
          <Crown className="h-4 w-4" /> Premium Subscriptions
          <Badge variant="secondary">{premiumCount} active</Badge>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-4">By Plan Type</p>
              <div className="space-y-3">
                <BreakdownRow label="Monthly" value={premiumByType.monthly} total={premiumCount} />
                <BreakdownRow label="Yearly" value={premiumByType.yearly} total={premiumCount} />
                <BreakdownRow label="Lifetime" value={premiumByType.lifetime} total={premiumCount} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-4">By Source</p>
              <div className="space-y-3">
                <BreakdownRow label="Stripe (Paid)" value={premiumBySource.stripe} total={premiumCount} />
                <BreakdownRow label="Domain Whitelist" value={premiumBySource.domain} total={premiumCount} />
                <BreakdownRow label="Promo Code" value={premiumBySource.promo} total={premiumCount} />
                <BreakdownRow label="Manual Grant" value={premiumBySource.manual} total={premiumCount} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Usage Metrics */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4" /> Platform Usage
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Clock} iconBg="bg-indigo-100 dark:bg-indigo-900/30" iconColor="text-indigo-600 dark:text-indigo-400"
            label="Total Hours" value={totalHours.toFixed(0)} sub={`${avgHoursPerUser}h per user`}
          />
          <StatCard
            icon={FileText} iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600 dark:text-emerald-400"
            label="Total Entries" value={entryCount} sub={`${avgEntriesPerUser} per user`}
          />
          <StatCard
            icon={Activity} iconBg="bg-amber-100 dark:bg-amber-900/30" iconColor="text-amber-600 dark:text-amber-400"
            label="Avg Session" value={`${avgSessionMin}m`} sub="Average duration"
          />
          <StatCard
            icon={Percent} iconBg="bg-purple-100 dark:bg-purple-900/30" iconColor="text-purple-600 dark:text-purple-400"
            label="Conversion Rate" value={`${conversionRate}%`} sub={`${userCount - premiumCount} free / ${premiumCount} premium`}
          />
        </div>
      </div>

      {/* Entry Type & Projects */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-3 flex items-center gap-2">
          <FolderKanban className="h-4 w-4" /> Content Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-4">Entry Types</p>
              <div className="space-y-3">
                <BreakdownRow label="Manual" value={entryByType.manual} total={entryCount} />
                <BreakdownRow label="Stopwatch" value={entryByType.stopwatch} total={entryCount} />
                <BreakdownRow label="Pomodoro" value={entryByType.pomodoro} total={entryCount} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-4">Quick Stats</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-600 dark:text-stone-300">Total Projects</span>
                  <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">{projectCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-600 dark:text-stone-300">Avg Projects/User</span>
                  <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">{avgProjectsPerUser}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-600 dark:text-stone-300">Avg Entries/Day (30d)</span>
                  <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">{avgEntriesPerDay}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-600 dark:text-stone-300">Avg Session Duration</span>
                  <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">{avgSessionMin}m</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Top Users by Hours */}
      {topUsers.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Top Users by Hours Tracked
          </h3>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topUsers.map((u, i) => (
                    <TableRow key={u.email}>
                      <TableCell className="font-medium text-stone-500 dark:text-stone-400">{i + 1}</TableCell>
                      <TableCell className="font-medium text-stone-900 dark:text-stone-100">{u.email}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={i === 0 ? 'default' : 'secondary'}>{u.hours}h</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Promo & Domain Stats */}
      <div>
        <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-3 flex items-center gap-2">
          <Ticket className="h-4 w-4" /> Promotions & Domains
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={Ticket} iconBg="bg-indigo-100 dark:bg-indigo-900/30" iconColor="text-indigo-600 dark:text-indigo-400"
            label="Active Promos" value={activePromos} sub={`${totalPromoUses} total uses`}
          />
          <StatCard
            icon={Globe} iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600 dark:text-emerald-400"
            label="Whitelisted Domains" value={activeDomains} sub={`${premiumBySource.domain} users granted`}
          />
          <StatCard
            icon={CreditCard} iconBg="bg-amber-100 dark:bg-amber-900/30" iconColor="text-amber-600 dark:text-amber-400"
            label="Manual Grants" value={premiumBySource.manual} sub="Admin-granted premium"
          />
        </div>
      </div>
    </div>
  )
}
