'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, TrendingUp } from 'lucide-react'

interface Props {
  plan: 'yearly' | 'lifetime'
  label: string
}

export default function UpgradeButton({ plan, label }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json() as { success?: boolean; url?: string; error?: string }
      if (data.url) {
        // Lifetime upgrade — redirect to Stripe checkout
        window.location.href = data.url
      } else if (data.success) {
        // Yearly upgrade — done in-place
        toast.success('Plan upgraded successfully!')
        setTimeout(() => window.location.reload(), 1500)
      } else {
        toast.error(data.error || 'Upgrade failed')
        setLoading(false)
      }
    } catch {
      toast.error('Upgrade failed')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 bg-indigo-500 hover:bg-indigo-600 text-white"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
      {loading ? 'Processing...' : label}
    </button>
  )
}
