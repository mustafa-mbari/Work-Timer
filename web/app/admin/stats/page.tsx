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
import { getTranslations } from 'next-intl/server'

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
  const t = await getTranslations('admin.stats')
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
        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">{t('title')}</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">{t('description')}</p>
      </div>

      {/* User Metrics */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-3 flex items-center gap-2">
          <Users className="h-4 w-4" /> {t('sectionUsers')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Users} iconBg="bg-indigo-100 dark:bg-indigo-900/30" iconColor="text-indigo-600 dark:text-indigo-400"
            label={t('totalUsers')} value={stats.userCount} sub={t('newThisWeek', { count: stats.newUsersThisWeek })}
          />
          <StatCard
            icon={Activity} iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600 dark:text-emerald-400"
            label={t('dau')} value={stats.dau} sub={t('dauSub')}
          />
          <StatCard
            icon={TrendingUp} iconBg="bg-amber-100 dark:bg-amber-900/30" iconColor="text-amber-600 dark:text-amber-400"
            label={t('wau')} value={stats.wau} sub={t('wauSub')}
          />
          <StatCard
            icon={UserCheck} iconBg="bg-purple-100 dark:bg-purple-900/30" iconColor="text-purple-600 dark:text-purple-400"
            label={t('mau')} value={stats.mau} sub={t('mauSub')}
          />
        </div>
      </div>

      {/* User Growth */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-3 flex items-center gap-2">
          <CalendarDays className="h-4 w-4" /> {t('userGrowth')}
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
          <Crown className="h-4 w-4" /> {t('premiumSubs')}
          <Badge variant="secondary">{t('premiumActive', { count: stats.premiumCount })}</Badge>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-4">{t('byPlanType')}</p>
              <div className="space-y-3">
                <BreakdownRow label={t('planMonthly')} value={stats.premiumByType.monthly} total={stats.premiumCount} />
                <BreakdownRow label={t('planYearly')} value={stats.premiumByType.yearly} total={stats.premiumCount} />
                <BreakdownRow label={t('planLifetime')} value={stats.premiumByType.lifetime} total={stats.premiumCount} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-4">{t('bySource')}</p>
              <div className="space-y-3">
                <BreakdownRow label={t('sourceStripePaid')} value={stats.premiumBySource.stripe} total={stats.premiumCount} />
                <BreakdownRow label={t('sourceDomain')} value={stats.premiumBySource.domain} total={stats.premiumCount} />
                <BreakdownRow label={t('sourcePromo')} value={stats.premiumBySource.promo} total={stats.premiumCount} />
                <BreakdownRow label={t('sourceManual')} value={stats.premiumBySource.manual} total={stats.premiumCount} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Usage Metrics */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4" /> {t('sectionUsage')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Clock} iconBg="bg-indigo-100 dark:bg-indigo-900/30" iconColor="text-indigo-600 dark:text-indigo-400"
            label={t('totalHours')} value={stats.totalHours.toFixed(0)} sub={t('hoursPerUser', { count: avgHoursPerUser })}
          />
          <StatCard
            icon={FileText} iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600 dark:text-emerald-400"
            label={t('totalEntries')} value={stats.totalEntries} sub={t('entriesPerUser', { count: avgEntriesPerUser })}
          />
          <StatCard
            icon={Activity} iconBg="bg-amber-100 dark:bg-amber-900/30" iconColor="text-amber-600 dark:text-amber-400"
            label={t('avgSession')} value={`${avgSessionMin}m`} sub={t('avgDuration')}
          />
          <StatCard
            icon={Percent} iconBg="bg-purple-100 dark:bg-purple-900/30" iconColor="text-purple-600 dark:text-purple-400"
            label={t('conversionRate')} value={`${conversionRate}%`} sub={t('conversionSub', { free: stats.userCount - stats.premiumCount, premium: stats.premiumCount })}
          />
        </div>
      </div>

      {/* Entry Type & Projects */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-3 flex items-center gap-2">
          <FolderKanban className="h-4 w-4" /> {t('sectionContent')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-4">{t('entryTypes')}</p>
              <div className="space-y-3">
                <BreakdownRow label={t('entryManual')} value={stats.entryByType.manual} total={stats.totalEntries} />
                <BreakdownRow label={t('entryStopwatch')} value={stats.entryByType.stopwatch} total={stats.totalEntries} />
                <BreakdownRow label={t('entryPomodoro')} value={stats.entryByType.pomodoro} total={stats.totalEntries} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-4">{t('quickStats')}</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-600 dark:text-stone-300">{t('totalProjects')}</span>
                  <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">{stats.projectCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-600 dark:text-stone-300">{t('avgProjectsPerUser')}</span>
                  <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">{avgProjectsPerUser}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-600 dark:text-stone-300">{t('avgEntriesPerDay')}</span>
                  <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">{avgEntriesPerDay}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-600 dark:text-stone-300">{t('avgSessionDuration')}</span>
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
            <TrendingUp className="h-4 w-4" /> {t('topUsers')}
          </h3>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">{t('colRank')}</TableHead>
                    <TableHead>{t('colUser')}</TableHead>
                    <TableHead className="text-right">{t('colHours')}</TableHead>
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
          <Ticket className="h-4 w-4" /> {t('sectionPromos')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={Ticket} iconBg="bg-indigo-100 dark:bg-indigo-900/30" iconColor="text-indigo-600 dark:text-indigo-400"
            label={t('activePromos')} value={stats.activePromos} sub={t('totalUses', { count: stats.totalPromoUses })}
          />
          <StatCard
            icon={Globe} iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600 dark:text-emerald-400"
            label={t('whitelistedDomains')} value={stats.activeDomains} sub={t('usersGranted', { count: stats.premiumBySource.domain })}
          />
          <StatCard
            icon={CreditCard} iconBg="bg-amber-100 dark:bg-amber-900/30" iconColor="text-amber-600 dark:text-amber-400"
            label={t('manualGrants')} value={stats.premiumBySource.manual} sub={t('adminGrantedPremium')}
          />
        </div>
      </div>
    </div>
  )
}
