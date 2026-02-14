import { createServiceClient } from '@/lib/supabase/server'

export default async function AdminStatsPage() {
  const supabase = await createServiceClient()

  // Fetch all data for analytics
  const { data: profiles } = await (supabase.from('profiles') as any).select('id, created_at')
  const { data: subscriptions } = await (supabase.from('subscriptions') as any).select('plan, status, granted_by')
  const { data: entries } = await (supabase.from('time_entries') as any).select('duration, date, user_id, created_at')
  const { data: promoCodes } = await (supabase.from('promo_codes') as any).select('code, current_uses, max_uses, active')
  const { data: domains } = await (supabase.from('whitelisted_domains') as any).select('domain, active')

  // Calculate metrics
  const totalUsers = profiles?.length || 0
  const now = new Date()

  // Active users (DAU/WAU/MAU)
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const dau = new Set(entries?.filter((e: any) => e.created_at >= dayAgo).map((e: any) => e.user_id)).size
  const wau = new Set(entries?.filter((e: any) => e.created_at >= weekAgo).map((e: any) => e.user_id)).size
  const mau = new Set(entries?.filter((e: any) => e.created_at >= monthAgo).map((e: any) => e.user_id)).size

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

  // Total hours tracked
  const totalHours = entries?.reduce((sum: number, e: any) => sum + (e.duration / 3600000), 0) || 0
  const totalEntries = entries?.length || 0
  const avgEntriesPerUser = totalUsers > 0 ? (totalEntries / totalUsers).toFixed(1) : '0'
  const avgHoursPerUser = totalUsers > 0 ? (totalHours / totalUsers).toFixed(1) : '0'

  // Entries per day (last 30 days)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const recentEntries = entries?.filter((e: any) => e.date >= thirtyDaysAgo) || []
  const avgEntriesPerDay = recentEntries.length > 0 ? (recentEntries.length / 30).toFixed(1) : '0'

  // Promo code stats
  const activePromos = promoCodes?.filter((p: any) => p.active).length || 0
  const totalPromoUses = promoCodes?.reduce((sum: number, p: any) => sum + p.current_uses, 0) || 0

  // Domain whitelist
  const activeDomains = domains?.filter((d: any) => d.active).length || 0

  // User growth (last 7 days)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const newUsersThisWeek = profiles?.filter((p: any) => p.created_at >= sevenDaysAgo).length || 0

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
            <div className="text-2xl font-bold text-stone-900">{totalUsers}</div>
            <div className="text-xs text-emerald-600 mt-1">+{newUsersThisWeek} this week</div>
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
            <div className="text-2xl font-bold text-stone-900">{totalEntries}</div>
            <div className="text-xs text-stone-500 mt-1">{avgEntriesPerUser} per user</div>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="text-xs text-stone-500 mb-1">Avg Entries/Day</div>
            <div className="text-2xl font-bold text-stone-900">{avgEntriesPerDay}</div>
            <div className="text-xs text-stone-500 mt-1">Last 30 days</div>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="text-xs text-stone-500 mb-1">Free vs Premium</div>
            <div className="text-2xl font-bold text-stone-900">{totalUsers - premiumCount} / {premiumCount}</div>
            <div className="text-xs text-stone-500 mt-1">{premiumCount > 0 ? ((premiumCount / totalUsers) * 100).toFixed(1) : 0}% conversion</div>
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
