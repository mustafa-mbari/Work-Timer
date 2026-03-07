import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Users, Crown, UserPlus, Clock, CreditCard, Tag, Globe, ShieldCheck } from 'lucide-react'
import { getAdminOverview, getPlatformStats, getPremiumBreakdown } from '@/lib/repositories/admin'

export const revalidate = 60

export default async function AdminOverviewPage() {
  const [overview, platformStats, premiumBreakdown] = await Promise.all([
    getAdminOverview(),
    getPlatformStats(),
    getPremiumBreakdown(),
  ])

  const total = overview.total_users
  const premium = premiumBreakdown.total_premium
  const free = total - premium
  const totalHours = platformStats.total_hours

  const recentUsers = overview.recent_users.map(u => ({
    email: u.email || 'Unknown',
    display_name: u.display_name,
    created_at: u.created_at,
  }))

  const stats = [
    {
      label: 'Total Users',
      value: total,
      icon: Users,
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      label: 'Premium Users',
      value: premium,
      icon: Crown,
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Free Users',
      value: free,
      icon: UserPlus,
      iconBg: 'bg-stone-100 dark:bg-stone-800',
      iconColor: 'text-stone-600 dark:text-stone-400',
    },
    {
      label: 'Total Hours',
      value: totalHours.toFixed(0),
      icon: Clock,
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
  ]

  return (
    <div>
      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.iconBg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
                <div>
                  <p className="text-sm text-stone-500 dark:text-stone-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Premium by source */}
      {premiumBreakdown.by_source && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Manual Grant', key: 'admin_manual', icon: ShieldCheck, iconBg: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400' },
            { label: 'Stripe Payment', key: 'stripe', icon: CreditCard, iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
            { label: 'Promo Code', key: 'promo', icon: Tag, iconBg: 'bg-pink-100 dark:bg-pink-900/30', iconColor: 'text-pink-600 dark:text-pink-400' },
            { label: 'Domain Whitelist', key: 'domain', icon: Globe, iconBg: 'bg-teal-100 dark:bg-teal-900/30', iconColor: 'text-teal-600 dark:text-teal-400' },
          ].map(card => (
            <Card key={card.key}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg}`}>
                    <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-sm text-stone-500 dark:text-stone-400">{card.label}</p>
                    <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                      {premiumBreakdown.by_source?.[card.key] ?? 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Conversion rate */}
      {total > 0 && (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-500 dark:text-stone-400">Conversion Rate</p>
                <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                  {((premium / total) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="flex-1 max-w-xs ml-6">
                <div className="h-2 rounded-full bg-stone-200 dark:bg-[var(--dark-elevated)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${(premium / total) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-stone-500 dark:text-stone-400">{free} free</span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">{premium} premium</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent sign-ups */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-stone-900 dark:text-stone-100">Recent Sign-ups</h2>
            <Badge variant="secondary">Latest {recentUsers.length}</Badge>
          </div>
          {recentUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentUsers.map(u => (
                  <TableRow key={u.email}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                          {u.display_name || u.email.split('@')[0]}
                        </p>
                        <p className="text-xs text-stone-500 dark:text-stone-400">{u.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm text-stone-500 dark:text-stone-400">
                      {new Date(u.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-stone-500 dark:text-stone-400">No users yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
