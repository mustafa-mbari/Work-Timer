'use client'

import { useState } from 'react'
import { PRICING } from '@shared/constants'

interface PricingCardProps {
  plan: 'monthly' | 'yearly' | 'lifetime'
  isLoggedIn: boolean
}

const PLAN_INFO = {
  monthly: {
    name: 'Monthly',
    price: PRICING.monthly,
    period: '/month',
    description: 'Full access, cancel anytime',
    priceId: 'monthly',
    badge: undefined,
  },
  yearly: {
    name: 'Yearly',
    price: PRICING.yearly,
    period: '/year',
    description: 'Save 58% vs monthly',
    badge: 'Best value',
    priceId: 'yearly',
  },
  lifetime: {
    name: 'Lifetime',
    price: PRICING.lifetime,
    period: ' one-time',
    description: 'Pay once, own forever',
    priceId: 'lifetime',
    badge: undefined,
  },
}

const FEATURES = [
  'Unlimited projects',
  'Full history (no 30-day limit)',
  'CSV & Excel export',
  'Cloud sync across devices',
  'Advanced analytics',
  'Priority support',
]

export default function PricingCard({ plan, isLoggedIn }: PricingCardProps) {
  const [loading, setLoading] = useState(false)
  const info = PLAN_INFO[plan]
  const isYearly = plan === 'yearly'

  async function handleUpgrade() {
    if (!isLoggedIn) {
      window.location.href = `/register`
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (data.url) window.location.href = data.url
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`relative rounded-2xl border p-6 flex flex-col gap-4 ${
      isYearly
        ? 'border-indigo-300 bg-indigo-50 shadow-md'
        : 'border-stone-200 bg-white'
    }`}>
      {info.badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs font-medium px-3 py-1 rounded-full">
          {info.badge}
        </span>
      )}

      <div>
        <h3 className="font-semibold text-stone-900">{info.name}</h3>
        <p className="text-sm text-stone-500 mt-0.5">{info.description}</p>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-stone-900">${info.price}</span>
        <span className="text-stone-500 text-sm">{info.period}</span>
      </div>

      <ul className="space-y-2 flex-1">
        {FEATURES.map(f => (
          <li key={f} className="flex items-center gap-2 text-sm text-stone-600">
            <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={handleUpgrade}
        disabled={loading}
        className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
          isYearly
            ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
            : 'border border-stone-200 hover:bg-stone-50 text-stone-700'
        }`}
      >
        {loading ? 'Loading…' : `Get ${info.name}`}
      </button>
    </div>
  )
}
