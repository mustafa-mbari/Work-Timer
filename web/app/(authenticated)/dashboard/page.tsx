import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Monitor, ArrowRight } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch subscription and sync cursors in parallel
  const [{ data: subscription }, { data: cursors }] = await Promise.all([
    (supabase.from('subscriptions') as any)
      .select('plan, status, current_period_end, cancel_at_period_end')
      .eq('user_id', user.id)
      .single(),
    (supabase.from('sync_cursors') as any)
      .select('device_id, last_sync')
      .eq('user_id', user.id)
      .order('last_sync', { ascending: false }),
  ])

  const isPremium = subscription?.plan !== 'free'
  const planLabel: Record<string, string> = {
    free: 'Free',
    premium_monthly: 'Premium Monthly',
    premium_yearly: 'Premium Yearly',
    premium_lifetime: 'Premium Lifetime',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Dashboard</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">{user.email}</p>
      </div>

      {/* Plan card */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Your Plan</CardTitle>
          <Badge variant={isPremium ? 'success' : 'secondary'}>
            {planLabel[subscription?.plan] || 'Free'}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-stone-600 dark:text-stone-400">
            {subscription?.plan === 'free' && (
              <p>You&apos;re on the free plan. Upgrade to unlock cloud sync, export, and unlimited projects.</p>
            )}
            {subscription?.plan === 'premium_monthly' && (
              <p>
                $1.99/month &middot;{' '}
                {subscription.cancel_at_period_end
                  ? `Cancels on ${new Date(subscription.current_period_end).toLocaleDateString()}`
                  : `Renews ${subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'N/A'}`}
              </p>
            )}
            {subscription?.plan === 'premium_yearly' && (
              <p>
                $9.99/year &middot;{' '}
                {subscription.cancel_at_period_end
                  ? `Cancels on ${new Date(subscription.current_period_end).toLocaleDateString()}`
                  : `Renews ${subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'N/A'}`}
              </p>
            )}
            {subscription?.plan === 'premium_lifetime' && (
              <p>Lifetime plan &middot; You own this forever. No renewals.</p>
            )}
          </div>
          <Button asChild variant="link" className="px-0 mt-2">
            <Link href="/billing">
              Manage billing <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Connected devices */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Devices</CardTitle>
        </CardHeader>
        <CardContent>
          {cursors && cursors.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead className="text-right">Last Sync</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cursors.map((c: any) => (
                  <TableRow key={c.device_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-[var(--dark-elevated)] flex items-center justify-center">
                          <Monitor className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">Chrome Extension</div>
                          <div className="text-xs text-stone-500 dark:text-stone-400">
                            {c.device_id.substring(0, 8)}&hellip;
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm text-stone-500 dark:text-stone-400">
                      {new Date(c.last_sync).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              No devices connected yet. Open the extension and go to Settings &rarr; Account to sync.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
