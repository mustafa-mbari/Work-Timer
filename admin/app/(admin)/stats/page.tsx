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
import { getAdminStats } from '@/lib/services/analytics'

export const revalidate = 60

function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const stats = await getAdminStats()

  const avgEntriesPerUser = stats.userCount > 0 ? (stats.totalEntries / stats.userCount).toFixed(1) : '0'
  const avgHoursPerUser = stats.userCount > 0 ? (stats.totalHours / stats.userCount).toFixed(1) : '0'
  const avgEntriesPerDay = stats.entryCount30d > 0 ? (stats.entryCount30d / 30).toFixed(1) : '0'
  const conversionRate = stats.userCount > 0 ? ((stats.premiumCount / stats.userCount) * 100).toFixed(1) : '0'
  const avgSessionMin = Math.round(stats.avgSessionMs / 60000)
  const avgProjectsPerUser = stats.userCount > 0 ? (stats.projectCount / stats.userCount).toFixed(1) : '0'

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Platform Statistics</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Aggregated metrics across all users and time entries.
        </p>
      </div>

      {/* User Metrics */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-3 flex items-center gap-2">
          <Users className="h-4 w-4" /> User Metrics
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Users} iconBg="bg-indigo-100 dark:bg-indigo-900/30" iconColor="text-indigo-600 dark:text-indigo-400"
            label="Total Users" value={stats.userCount} sub={`+${stats.newUsersThisWeek} this week`}
          />
          <StatCard
            icon={Activity} iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600 dark:text-emerald-400"
            label="DAU" value={stats.dau} sub="Active today"
          />
          <StatCard
            icon={TrendingUp} iconBg="bg-amber-100 dark:bg-amber-900/30" iconColor="text-amber-600 dark:text-amber-400"
            label="WAU" value={stats.wau} sub="Active this week"
          />
          <StatCard
            icon={UserCheck} iconBg="bg-purple-100 dark:bg-purple-900/30" iconColor="text-purple-600 dark:text-purple-400"
            label="MAU" value={stats.mau} sub="Active this month"
          />
        </div>
      </div>

      {/* User Growth */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-3 flex items-center gap-2">
          <CalendarDays className="h-4 w-4" /> User Growth (8 weeks)
        </h3>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-end gap-2 h-32">
              {stats.userGrowth.map((w, i) => {
                const maxCount = Math.max(...stats.userGrowth.map(x => x.count), 1)
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
          <Badge variant="secondary">{stats.premiumCount} active</Badge>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-4">By Plan Type</p>
              <div className="space-y-3">
                <BreakdownRow label="Monthly" value={stats.premiumByType.monthly} total={stats.premiumCount} />
                <BreakdownRow label="Yearly" value={stats.premiumByType.yearly} total={stats.premiumCount} />
                <BreakdownRow label="Lifetime" value={stats.premiumByType.lifetime} total={stats.premiumCount} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-4">By Source</p>
              <div className="space-y-3">
                <BreakdownRow label="Stripe (paid)" value={stats.premiumBySource.stripe} total={stats.premiumCount} />
                <BreakdownRow label="Domain whitelist" value={stats.premiumBySource.domain} total={stats.premiumCount} />
                <BreakdownRow label="Promo code" value={stats.premiumBySource.promo} total={stats.premiumCount} />
                <BreakdownRow label="Manual grant" value={stats.premiumBySource.manual} total={stats.premiumCount} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Usage Metrics */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4" /> Usage Metrics
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Clock} iconBg="bg-indigo-100 dark:bg-indigo-900/30" iconColor="text-indigo-600 dark:text-indigo-400"
            label="Total Hours" value={stats.totalHours.toFixed(0)} sub={`${avgHoursPerUser}h per user`}
          />
          <StatCard
            icon={FileText} iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600 dark:text-emerald-400"
            label="Total Entries" value={stats.totalEntries} sub={`${avgEntriesPerUser} per user`}
          />
          <StatCard
            icon={Activity} iconBg="bg-amber-100 dark:bg-amber-900/30" iconColor="text-amber-600 dark:text-amber-400"
            label="Avg Session" value={`${avgSessionMin}m`} sub="Average duration"
          />
          <StatCard
            icon={Percent} iconBg="bg-purple-100 dark:bg-purple-900/30" iconColor="text-purple-600 dark:text-purple-400"
            label="Conversion Rate" value={`${conversionRate}%`}
            sub={`${stats.userCount - stats.premiumCount} free · ${stats.premiumCount} premium`}
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
                <BreakdownRow label="Manual" value={stats.entryByType.manual} total={stats.totalEntries} />
                <BreakdownRow label="Stopwatch" value={stats.entryByType.stopwatch} total={stats.totalEntries} />
                <BreakdownRow label="Pomodoro" value={stats.entryByType.pomodoro} total={stats.totalEntries} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-4">Quick Stats</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-600 dark:text-stone-300">Total Projects</span>
                  <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">{stats.projectCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-600 dark:text-stone-300">Avg Projects / User</span>
                  <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">{avgProjectsPerUser}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-600 dark:text-stone-300">Avg Entries / Day (30d)</span>
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
      {stats.topUsers.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Top Users by Hours
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
                  {stats.topUsers.map((u, i) => (
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
          <Ticket className="h-4 w-4" /> Promos & Domains
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={Ticket} iconBg="bg-indigo-100 dark:bg-indigo-900/30" iconColor="text-indigo-600 dark:text-indigo-400"
            label="Active Promos" value={stats.activePromos} sub={`${stats.totalPromoUses} total uses`}
          />
          <StatCard
            icon={Globe} iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600 dark:text-emerald-400"
            label="Whitelisted Domains" value={stats.activeDomains} sub={`${stats.premiumBySource.domain} users granted`}
          />
          <StatCard
            icon={CreditCard} iconBg="bg-amber-100 dark:bg-amber-900/30" iconColor="text-amber-600 dark:text-amber-400"
            label="Manual Grants" value={stats.premiumBySource.manual} sub="Admin-granted premium"
          />
        </div>
      </div>
    </div>
  )
}
