'use client'

import { useState } from 'react'

export default function PromoCodeInput() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return

    setLoading(true)
    setMessage(null)

    try {
      // Validate first
      const validateRes = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      })
      const validateData = await validateRes.json()

      if (!validateData.valid) {
        setMessage({ type: 'error', text: validateData.error || 'Invalid promo code' })
        setLoading(false)
        return
      }

      // Redeem the code
      const redeemRes = await fetch('/api/promo/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      })
      const redeemData = await redeemRes.json()

      if (redeemData.success) {
        if (redeemData.checkoutUrl) {
          // Partial discount — redirect to Stripe checkout with coupon
          window.location.href = redeemData.checkoutUrl
        } else {
          // 100% discount — premium granted directly
          setMessage({ type: 'success', text: 'Premium activated! Refreshing…' })
          setTimeout(() => window.location.reload(), 1500)
        }
      } else {
        setMessage({ type: 'error', text: redeemData.error || 'Failed to redeem code' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-3">
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="PROMO CODE"
          className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Applying…' : 'Apply'}
        </button>
      </div>
      {message && (
        <p className={`text-sm ${message.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
          {message.text}
        </p>
      )}
    </form>
  )
}
