'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'

export default function PortalButton() {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json() as { url?: string; error?: string }
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || 'Failed to open billing portal')
        setLoading(false)
      }
    } catch {
      toast.error('Failed to open billing portal')
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading} variant="outline">
      <ExternalLink className="h-4 w-4" />
      {loading ? 'Opening...' : 'Open Stripe Portal'}
    </Button>
  )
}
