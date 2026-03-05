'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ExportQuota, ExportType } from '@/lib/shared/types'

interface UseExportQuotaReturn {
  quota: ExportQuota | null
  loading: boolean
  /** Call before triggering generation. Returns true if allowed. */
  trackExport: (type: ExportType) => Promise<boolean>
}

export function useExportQuota(): UseExportQuotaReturn {
  const [quota, setQuota] = useState<ExportQuota | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchQuota = useCallback(async () => {
    try {
      const res = await fetch('/api/export/usage')
      if (!res.ok) return
      const data: ExportQuota = await res.json()
      setQuota(data)
    } catch {
      // Silently ignore — quota display is best-effort
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchQuota()
  }, [fetchQuota])

  const trackExport = useCallback(async (type: ExportType): Promise<boolean> => {
    try {
      const res = await fetch('/api/export/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })

      if (res.status === 429) {
        // Limit reached — refresh quota so badge updates
        await fetchQuota()
        return false
      }

      if (!res.ok) {
        // Non-quota error — fail open
        return true
      }

      // Success — update quota optimistically
      const result = await res.json()
      setQuota(prev => {
        if (!prev) return prev
        return {
          ...prev,
          items: prev.items.map(item =>
            item.export_type === type
              ? { ...item, used: result.used, remaining: result.remaining }
              : item
          ),
        }
      })
      return true
    } catch {
      // Network error — fail open
      return true
    }
  }, [fetchQuota])

  return { quota, loading, trackExport }
}
