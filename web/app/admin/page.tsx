import { createServiceClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Users, Crown, UserPlus, Clock, FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminOverviewPage() {
  const supabase = await createServiceClient()

  // Use auth.admin for accurate user count (profiles table may be incomplete)
  const [
    { data: { users: authUsers } },
    { data: subscriptions, error: subErr },
    { data: allEntries, error: entriesErr },
  ] = await Promise.all([
    supabase.auth.admin.listUsers({ perPage: 10000 }),
    (supabase.from('subscriptions') as any).select('plan, status').range(0, 49999),
    (supabase.from('time_entries') as any).select('duration').is('deleted_at', null).range(0, 49999),
  ])

  if (subErr) console.error('Subscriptions query error:', subErr)
  if (entriesErr) console.error('Entries query error:', entriesErr)

  const total = authUsers?.length ?? 0
  const premiumSubs = subscriptions?.filter((s: any) => s.plan !== 'free' && s.status === 'active') || []
  const premium = premiumSubs.length
  const free = total - premium
  const totalHours = allEntries?.reduce((sum: number, e: any) => sum + (e.duration / 3600000), 0) || 0

  // Recent sign-ups from auth users (sorted by created_at desc, take 10)
  const recentUsers = [...(authUsers || [])]
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)
    .map((u: any) => ({
      email: u.email || 'Unknown',
      display_name: u.user_metadata?.full_name || u.user_metadata?.name || null,
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
      label: 'Total Hours Tracked',
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
                  <span className="text-xs text-stone-500 dark:text-stone-400">Free: {free}</span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">Premium: {premium}</span>
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
            <Badge variant="secondary">{recentUsers?.length ?? 0} latest</Badge>
          </div>
          {recentUsers && recentUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentUsers.map((u: any) => (
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
                      {new Date(u.created_at).toLocaleDateString('en-US', {
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
            <p className="text-sm text-stone-500 dark:text-stone-400">No users yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
