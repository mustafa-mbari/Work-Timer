'use client'

import { useState, useEffect } from 'react'

export default function AdminDomainsPage() {
  const [domains, setDomains] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchDomains()
  }, [])

  async function fetchDomains() {
    const res = await fetch('/api/admin/domains')
    const data = await res.json()
    setDomains(data.domains ?? [])
    setLoading(false)
  }

  async function addDomain(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const domain = (formData.get('domain') as string).trim().toLowerCase()
    const plan = formData.get('plan') as string

    // Client-side validation
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain)) {
      setError('Invalid domain format (e.g. example.com)')
      setSubmitting(false)
      return
    }

    if (domains.some(d => d.domain === domain)) {
      setError('This domain is already whitelisted')
      setSubmitting(false)
      return
    }

    const res = await fetch('/api/admin/domains', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, plan }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Failed to add domain')
    } else {
      e.currentTarget.reset()
    }

    setSubmitting(false)
    await fetchDomains()
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch('/api/admin/domains', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    })
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
            disabled={submitting}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {submitting ? 'Adding…' : 'Add'}
          </button>
        </form>
        {error && <p className="text-sm text-rose-600 mt-2">{error}</p>}
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
