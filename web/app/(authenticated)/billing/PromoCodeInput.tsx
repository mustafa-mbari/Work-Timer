'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function PromoCodeInput() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return

    setLoading(true)

    try {
      const validateRes = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      })
      const validateData = await validateRes.json()

      if (!validateData.valid) {
        toast.error(validateData.error || 'Invalid promo code')
        setLoading(false)
        return
      }

      const redeemRes = await fetch('/api/promo/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      })
      const redeemData = await redeemRes.json()

      if (redeemData.success) {
        if (redeemData.checkoutUrl) {
          window.location.href = redeemData.checkoutUrl
        } else {
          toast.success('Premium activated! Refreshing...')
          setTimeout(() => window.location.reload(), 1500)
        }
      } else {
        toast.error(redeemData.error || 'Failed to redeem code')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <Input
        type="text"
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase())}
        placeholder="PROMO CODE"
        className="flex-1 font-mono tracking-wider"
      />
      <Button type="submit" disabled={loading || !code.trim()}>
        {loading ? 'Applying...' : 'Apply'}
      </Button>
    </form>
  )
}
