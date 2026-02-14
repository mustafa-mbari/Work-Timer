'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminPromosPage() {
  const [promos, setPromos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchPromos()
  }, [])

  async function fetchPromos() {
    const { data } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false })
    setPromos(data ?? [])
    setLoading(false)
  }

  async function addPromo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const code = formData.get('code') as string
    const discount_pct = parseInt(formData.get('discount_pct') as string)
    const plan = formData.get('plan') as string
    const max_uses = formData.get('max_uses') ? parseInt(formData.get('max_uses') as string) : null

    await (supabase.from('promo_codes') as any).insert({
      code,
      discount_pct,
      plan,
      max_uses,
      active: true,
    })
    e.currentTarget.reset()
    await fetchPromos()
  }

  async function toggleActive(id: string, active: boolean) {
    await (supabase.from('promo_codes') as any).update({ active: !active }).eq('id', id)
    await fetchPromos()
  }

  if (loading) return <div className="text-sm text-stone-500">Loading...</div>

  return (
    <div>
      <div className="rounded-2xl border border-stone-200 bg-white p-6 mb-6">
        <h2 className="font-semibold text-stone-900 mb-4">Create Promo Code</h2>
        <form onSubmit={addPromo} className="grid grid-cols-2 gap-3">
          <input
            name="code"
            placeholder="LAUNCH50"
            required
            className="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            name="discount_pct"
            type="number"
            min="1"
            max="100"
            placeholder="Discount %"
            required
            className="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          <input
            name="max_uses"
            type="number"
            min="1"
            placeholder="Max uses (optional)"
            className="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="col-span-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Create Code
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-600">Code</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-600">Discount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-600">Plan</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-600">Uses</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-600">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {promos.map(p => (
              <tr key={p.id}>
                <td className="px-4 py-3 text-sm font-mono text-stone-700">{p.code}</td>
                <td className="px-4 py-3 text-sm text-stone-600">{p.discount_pct}%</td>
                <td className="px-4 py-3 text-sm text-stone-600">{p.plan}</td>
                <td className="px-4 py-3 text-sm text-stone-600">
                  {p.current_uses} {p.max_uses ? `/ ${p.max_uses}` : ''}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                    p.active ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'
                  }`}>
                    {p.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(p.id, p.active)}
                    className="text-xs text-indigo-500 hover:text-indigo-600"
                  >
                    {p.active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
