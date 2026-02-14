'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminDomainsPage() {
  const [domains, setDomains] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchDomains()
  }, [])

  async function fetchDomains() {
    const { data } = await supabase
      .from('whitelisted_domains')
      .select('*')
      .order('created_at', { ascending: false })
    setDomains(data ?? [])
    setLoading(false)
  }

  async function addDomain(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const domain = formData.get('domain') as string
    const plan = formData.get('plan') as string

    await (supabase.from('whitelisted_domains') as any).insert({ domain, plan, active: true })
    e.currentTarget.reset()
    await fetchDomains()
  }

  async function toggleActive(id: string, active: boolean) {
    await (supabase.from('whitelisted_domains') as any).update({ active: !active }).eq('id', id)
    await fetchDomains()
  }

  if (loading) return <div className="text-sm text-stone-500">Loading...</div>

  return (
    <div>
      <div className="rounded-2xl border border-stone-200 bg-white p-6 mb-6">
        <h2 className="font-semibold text-stone-900 mb-4">Add Whitelisted Domain</h2>
        <form onSubmit={addDomain} className="flex gap-3">
          <input
            name="domain"
            placeholder="example.com"
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
            Add
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-600">Domain</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-600">Plan</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-600">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {domains.map(d => (
              <tr key={d.id}>
                <td className="px-4 py-3 text-sm text-stone-700">{d.domain}</td>
                <td className="px-4 py-3 text-sm text-stone-600">{d.plan}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                    d.active ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'
                  }`}>
                    {d.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(d.id, d.active)}
                    className="text-xs text-indigo-500 hover:text-indigo-600"
                  >
                    {d.active ? 'Deactivate' : 'Activate'}
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
