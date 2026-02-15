'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'

interface CheckoutButtonProps {
  plan: 'monthly' | 'yearly' | 'lifetime'
  label: string
}

export default function CheckoutButton({ plan, label }: CheckoutButtonProps) {
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
    <Button
      onClick={handleClick}
      disabled={loading}
      variant="outline"
      className="w-full justify-between h-auto py-3"
    >
      <span>{label}</span>
      <ChevronRight className="h-4 w-4 text-stone-400" />
    </Button>
  )
}
