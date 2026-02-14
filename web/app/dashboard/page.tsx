import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch subscription
  const { data: subscription } = await (supabase
    .from('subscriptions') as any)
    .select('plan, status, current_period_end, cancel_at_period_end')
    .eq('user_id', user.id)
    .single()

  // Fetch sync cursors
  const { data: cursors } = await (supabase
    .from('sync_cursors') as any)
    .select('device_id, last_sync')
    .eq('user_id', user.id)
    .order('last_sync', { ascending: false })

  const planBadge = subscription?.plan === 'free'
    ? { label: 'Free', color: 'bg-stone-100 text-stone-600' }
    : { label: 'Premium', color: 'bg-emerald-100 text-emerald-700' }

  async function handleSignOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 mb-1">Dashboard</h1>
          <p className="text-sm text-stone-500">{user.email}</p>
        </div>
        <form action={handleSignOut}>
          <button
            type="submit"
            className="px-4 py-2 border border-stone-200 hover:bg-stone-50 text-stone-700 text-sm font-medium rounded-lg transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>

      {/* Plan card */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-stone-900">Plan</h2>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${planBadge.color}`}>
            {planBadge.label}
          </span>
        </div>
        <div className="text-sm text-stone-600">
          {subscription?.plan === 'free' && (
            <p>You're on the free plan. Upgrade to unlock cloud sync, export, and unlimited projects.</p>
          )}
          {subscription?.plan === 'premium_monthly' && (
            <p>Monthly plan • ${1.99}/mo • Renews {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'N/A'}</p>
          )}
          {subscription?.plan === 'premium_yearly' && (
            <p>Yearly plan • ${9.99}/yr • Renews {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'N/A'}</p>
          )}
          {subscription?.plan === 'premium_lifetime' && (
            <p>Lifetime plan • You own this forever. No renewals.</p>
          )}
        </div>
        <a
          href="/billing"
          className="inline-block mt-4 text-sm font-medium text-indigo-500 hover:text-indigo-600 transition-colors"
        >
          Manage billing →
        </a>
      </div>

      {/* Connected devices */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="font-semibold text-stone-900 mb-4">Connected Devices</h2>
        {cursors && cursors.length > 0 ? (
          <div className="space-y-3">
            {cursors.map((c: any) => (
              <div key={c.device_id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-stone-900">
                      Chrome Extension
                    </div>
                    <div className="text-xs text-stone-500">
                      Device ID: {c.device_id.substring(0, 8)}…
                    </div>
                  </div>
                </div>
                <div className="text-xs text-stone-500">
                  Last sync: {new Date(c.last_sync).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-500">
            No devices connected yet. Open the extension and go to Settings → Account to sync.
          </p>
        )}
      </div>
    </div>
  )
}
