'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface CheckoutButtonProps {
  plan: 'monthly' | 'yearly'
    | 'team_10_monthly' | 'team_10_yearly'
    | 'team_20_monthly' | 'team_20_yearly'
    | 'allin_monthly' | 'allin_yearly'
  label: string
  highlight?: boolean
}

export default function CheckoutButton({ plan, label, highlight }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || 'Failed to create checkout session')
        setLoading(false)
      }
    } catch {
      toast.error('Failed to start checkout')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${
        highlight
          ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
          : 'bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900'
      }`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {loading ? 'Redirecting...' : label}
    </button>
  )
}
