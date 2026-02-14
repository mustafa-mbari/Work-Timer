import { createServiceClient } from '@/lib/supabase/server'

export default async function AdminOverviewPage() {
  const supabase = await createServiceClient()

  // Fetch stats
  const [
    { count: totalUsers },
    { count: premiumUsers },
    { data: recentUsers },
  ] = await Promise.all([
    (supabase.from('profiles') as any).select('*', { count: 'exact', head: true }),
    (supabase.from('subscriptions') as any).select('*', { count: 'exact', head: true }).neq('plan', 'free'),
    (supabase.from('profiles') as any).select('email, created_at').order('created_at', { ascending: false }).limit(5),
  ])

  const stats = [
    { label: 'Total Users', value: totalUsers ?? 0, color: 'bg-indigo-50 text-indigo-700' },
    { label: 'Premium Users', value: premiumUsers ?? 0, color: 'bg-emerald-50 text-emerald-700' },
    { label: 'Free Users', value: (totalUsers ?? 0) - (premiumUsers ?? 0), color: 'bg-stone-50 text-stone-700' },
  ]

  return (
    <div>
      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map(stat => (
          <div key={stat.label} className="rounded-2xl border border-stone-200 bg-white p-6">
            <div className={`text-xs font-medium mb-1 ${stat.color}`}>{stat.label}</div>
            <div className="text-3xl font-bold text-stone-900">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Recent users */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="font-semibold text-stone-900 mb-4">Recent Sign-ups</h2>
        {recentUsers && recentUsers.length > 0 ? (
          <div className="space-y-2">
            {recentUsers.map((u: any) => (
              <div key={u.email} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                <span className="text-sm text-stone-700">{u.email}</span>
                <span className="text-xs text-stone-500">
                  {new Date(u.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-500">No users yet</p>
        )}
      </div>
    </div>
  )
}
