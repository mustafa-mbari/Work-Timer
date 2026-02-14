'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  async function fetchSubscriptions() {
    const { data } = await (supabase
      .from('subscriptions') as any)
      .select(`
        *,
        profiles (
          email
        )
      `)
      .order('updated_at', { ascending: false })
    setSubscriptions(data ?? [])
    setLoading(false)
  }

  async function grantPremium(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const plan = formData.get('plan') as string

    // Find user by email
    const { data: profile } = await (supabase
      .from('profiles') as any)
      .select('id')
      .eq('email', email)
      .single()

    if (!profile) {
      alert('User not found')
      return
    }

    // Update subscription
    await (supabase.from('subscriptions') as any).upsert({
      user_id: profile.id,
      plan,
      status: 'active',
      granted_by: 'admin_manual',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    e.currentTarget.reset()
    await fetchSubscriptions()
  }

  if (loading) return <div className="text-sm text-stone-500">Loading...</div>

  return (
    <div>
      <div className="rounded-2xl border border-stone-200 bg-white p-6 mb-6">
        <h2 className="font-semibold text-stone-900 mb-4">Grant Premium Manually</h2>
        <form onSubmit={grantPremium} className="flex gap-3">
          <input
            name="email"
            type="email"
            placeholder="user@example.com"
            required
            className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            name="plan"
            required
            className="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="premium_monthly">Monthly</option>
            <option value="premium_yearly">Yearly</option>
            <option value="premium_lifetime">Lifetime</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Grant
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-600">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-600">Plan</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-600">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-600">Granted By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {subscriptions.map(s => {
              const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
              return (
                <tr key={s.id}>
                  <td className="px-4 py-3 text-sm text-stone-700">{profile?.email}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                      s.plan === 'free'
                        ? 'bg-stone-100 text-stone-600'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {s.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-600">{s.status}</td>
                  <td className="px-4 py-3 text-sm text-stone-500">{s.granted_by || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
