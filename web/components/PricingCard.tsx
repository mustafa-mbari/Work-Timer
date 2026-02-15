'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { PRICING } from '@shared/constants'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    badge: undefined as string | undefined,
  },
  yearly: {
    name: 'Yearly',
    price: PRICING.yearly,
    period: '/year',
    description: 'Save 58% vs monthly',
    badge: 'Best value',
  },
  lifetime: {
    name: 'Lifetime',
    price: PRICING.lifetime,
    period: ' one-time',
    description: 'Pay once, own forever',
    badge: undefined as string | undefined,
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
      window.location.href = '/register'
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
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || 'Failed to create checkout session')
      }
    } catch {
      toast.error('Failed to start checkout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className={cn(
      'relative flex flex-col',
      isYearly && 'border-indigo-300 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-md'
    )}>
      {info.badge && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white border-0">
          {info.badge}
        </Badge>
      )}

      <CardContent className="pt-6 flex flex-col gap-4 flex-1">
        <div>
          <h3 className="font-semibold text-stone-900 dark:text-stone-100">{info.name}</h3>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{info.description}</p>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-stone-900 dark:text-stone-100">${info.price}</span>
          <span className="text-stone-500 dark:text-stone-400 text-sm">{info.period}</span>
        </div>

        <ul className="space-y-2 flex-1">
          {FEATURES.map(f => (
            <li key={f} className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
              <Check className="h-4 w-4 text-emerald-500 shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        <Button
          onClick={handleUpgrade}
          disabled={loading}
          variant={isYearly ? 'default' : 'outline'}
          className="w-full"
        >
          {loading ? 'Loading...' : `Get ${info.name}`}
        </Button>
      </CardContent>
    </Card>
  )
}
