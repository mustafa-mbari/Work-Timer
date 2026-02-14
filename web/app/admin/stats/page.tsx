import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminStatsPage() {
  const supabase = await createServiceClient()

  // Fetch lightweight data (profiles, subscriptions, promos, domains are small tables)
  const [
    { count: totalUsers },
    { data: subscriptions },
    { data: promoCodes },
    { data: domains },
  ] = await Promise.all([
    (supabase.from('profiles') as any).select('*', { count: 'exact', head: true }),
    (supabase.from('subscriptions') as any).select('plan, status, granted_by'),
    (supabase.from('promo_codes') as any).select('code, current_uses, max_uses, active'),
    (supabase.from('whitelisted_domains') as any).select('domain, active'),
  ])

  const userCount = totalUsers || 0
  const now = new Date()

  // Time-based thresholds
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgoDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Active users — fetch only distinct user_ids for each time window, not all entries
  const [
    { data: dauData },
    { data: wauData },
    { data: mauData },
  ] = await Promise.all([
    (supabase.from('time_entries') as any)
      .select('user_id')
      .is('deleted_at', null)
      .gte('created_at', dayAgo),
    (supabase.from('time_entries') as any)
      .select('user_id')
      .is('deleted_at', null)
      .gte('created_at', weekAgo),
    (supabase.from('time_entries') as any)
      .select('user_id')
      .is('deleted_at', null)
      .gte('created_at', monthAgo),
  ])

  const dau = new Set(dauData?.map((e: any) => e.user_id)).size
  const wau = new Set(wauData?.map((e: any) => e.user_id)).size
  const mau = new Set(mauData?.map((e: any) => e.user_id)).size

  // Total entries count (head-only, no data transfer)
  const { count: totalEntries } = await (supabase.from('time_entries') as any)
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)
  const entryCount = totalEntries || 0

  // Total hours — fetch only duration column
  const { data: durationData } = await (supabase.from('time_entries') as any)
    .select('duration')
    .is('deleted_at', null)

  const totalHours = durationData?.reduce((sum: number, e: any) => sum + (e.duration / 3600000), 0) || 0
  const avgEntriesPerUser = userCount > 0 ? (entryCount / userCount).toFixed(1) : '0'
  const avgHoursPerUser = userCount > 0 ? (totalHours / userCount).toFixed(1) : '0'

  // Recent entries count (last 30 days)
  const { count: recentCount } = await (supabase.from('time_entries') as any)
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)
    .gte('date', thirtyDaysAgoDate)
  const avgEntriesPerDay = recentCount ? (recentCount / 30).toFixed(1) : '0'

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

  // New users this week
  const { count: newUsersThisWeek } = await (supabase.from('profiles') as any)
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekAgo)

  // Promo code stats
  const activePromos = promoCodes?.filter((p: any) => p.active).length || 0
  const totalPromoUses = promoCodes?.reduce((sum: number, p: any) => sum + p.current_uses, 0) || 0

  // Domain whitelist
  const activeDomains = domains?.filter((d: any) => d.active).length || 0

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-bold text-stone-900">Global Statistics</h2>
        <p className="text-sm text-stone-500 mt-1">Platform-wide metrics and engagement</p>
      </div>

      {/* User Metrics */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-stone-700 mb-3">Users</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="text-xs text-stone-500 mb-1">Total Users</div>
            <div className="text-2xl font-bold text-stone-900">{userCount}</div>
            <div className="text-xs text-emerald-600 mt-1">+{newUsersThisWeek || 0} this week</div>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="text-xs text-stone-500 mb-1">DAU</div>
            <div className="text-2xl font-bold text-stone-900">{dau}</div>
            <div className="text-xs text-stone-500 mt-1">Daily active</div>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="text-xs text-stone-500 mb-1">WAU</div>
            <div className="text-2xl font-bold text-stone-900">{wau}</div>
            <div className="text-xs text-stone-500 mt-1">Weekly active</div>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="text-xs text-stone-500 mb-1">MAU</div>
            <div className="text-2xl font-bold text-stone-900">{mau}</div>
            <div className="text-xs text-stone-500 mt-1">Monthly active</div>
          </div>
        </div>
      </div>

      {/* Premium Metrics */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-stone-700 mb-3">Premium Subscriptions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="text-xs text-stone-500 mb-3">By Plan Type</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600">Monthly</span>
                <span className="text-sm font-semibold text-stone-900">{premiumByType.monthly}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600">Yearly</span>
                <span className="text-sm font-semibold text-stone-900">{premiumByType.yearly}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600">Lifetime</span>
                <span className="text-sm font-semibold text-stone-900">{premiumByType.lifetime}</span>
              </div>
              <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
                <span className="text-sm font-medium text-stone-900">Total Premium</span>
                <span className="text-lg font-bold text-indigo-600">{premiumCount}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="text-xs text-stone-500 mb-3">By Source</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600">Stripe (Paid)</span>
                <span className="text-sm font-semibold text-stone-900">{premiumBySource.stripe}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600">Domain Whitelist</span>
                <span className="text-sm font-semibold text-stone-900">{premiumBySource.domain}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600">Promo Code</span>
                <span className="text-sm font-semibold text-stone-900">{premiumBySource.promo}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600">Manual Grant</span>
                <span className="text-sm font-semibold text-stone-900">{premiumBySource.manual}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Metrics */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-stone-700 mb-3">Platform Usage</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="text-xs text-stone-500 mb-1">Total Hours Tracked</div>
            <div className="text-2xl font-bold text-stone-900">{totalHours.toFixed(0)}</div>
            <div className="text-xs text-stone-500 mt-1">{avgHoursPerUser}h per user</div>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="text-xs text-stone-500 mb-1">Total Entries</div>
            <div className="text-2xl font-bold text-stone-900">{entryCount}</div>
            <div className="text-xs text-stone-500 mt-1">{avgEntriesPerUser} per user</div>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="text-xs text-stone-500 mb-1">Avg Entries/Day</div>
            <div className="text-2xl font-bold text-stone-900">{avgEntriesPerDay}</div>
            <div className="text-xs text-stone-500 mt-1">Last 30 days</div>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="text-xs text-stone-500 mb-1">Free vs Premium</div>
            <div className="text-2xl font-bold text-stone-900">{userCount - premiumCount} / {premiumCount}</div>
            <div className="text-xs text-stone-500 mt-1">{premiumCount > 0 ? ((premiumCount / userCount) * 100).toFixed(1) : 0}% conversion</div>
          </div>
        </div>
      </div>

      {/* Promo & Domain Stats */}
      <div>
        <h3 className="text-sm font-medium text-stone-700 mb-3">Promotions & Domains</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="text-xs text-stone-500 mb-1">Active Promo Codes</div>
            <div className="text-2xl font-bold text-stone-900">{activePromos}</div>
            <div className="text-xs text-stone-500 mt-1">{totalPromoUses} total uses</div>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="text-xs text-stone-500 mb-1">Whitelisted Domains</div>
            <div className="text-2xl font-bold text-stone-900">{activeDomains}</div>
            <div className="text-xs text-stone-500 mt-1">{premiumBySource.domain} users granted</div>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="text-xs text-stone-500 mb-1">Manual Grants</div>
            <div className="text-2xl font-bold text-stone-900">{premiumBySource.manual}</div>
            <div className="text-xs text-stone-500 mt-1">Admin-granted premium</div>
          </div>
        </div>
      </div>
    </div>
  )
}
