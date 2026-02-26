'use client'

import { useState, useEffect, useCallback } from 'react'
import { ClipboardCheck, Clock } from 'lucide-react'
import type { GroupShareWithMeta } from '@/lib/repositories/groupShares'
import ReviewDialog from './ReviewDialog'

interface Props {
  groupId: string
}

function formatPeriod(share: GroupShareWithMeta): string {
  const from = new Date(share.date_from + 'T00:00:00')
  const to = new Date(share.date_to + 'T00:00:00')
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (share.period_type === 'day') return from.toLocaleDateString(undefined, opts)
  return `${from.toLocaleDateString(undefined, opts)} – ${to.toLocaleDateString(undefined, opts)}`
}

function formatHours(h: number): string {
  return h < 10 ? h.toFixed(1) + 'h' : Math.round(h) + 'h'
}

export default function PendingReviewsPanel({ groupId }: Props) {
  const [shares, setShares] = useState<GroupShareWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewShare, setReviewShare] = useState<GroupShareWithMeta | null>(null)

  const fetchShares = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/shares?status=submitted`)
      if (res.ok) setShares(await res.json())
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => { fetchShares() }, [fetchShares])

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-stone-200 dark:bg-stone-700" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-40 rounded bg-stone-200 dark:bg-stone-700" />
                <div className="h-2.5 w-24 rounded bg-stone-100 dark:bg-stone-800" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (shares.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-stone-200 dark:border-[var(--dark-border)] p-10 text-center">
        <ClipboardCheck className="h-8 w-8 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
        <p className="text-sm text-stone-500 dark:text-stone-400">No pending reviews</p>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
          Submitted shares from members will appear here.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {shares.map(share => (
          <div
            key={share.id}
            className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-semibold text-indigo-700 dark:text-indigo-300 shrink-0">
                  {(share.sharer_name || share.sharer_email).slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-800 dark:text-stone-100 truncate">
                    {share.sharer_name || share.sharer_email.split('@')[0]}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-stone-400">
                    <span>{formatPeriod(share)}</span>
                    <span className="text-stone-300 dark:text-stone-600">|</span>
                    <span>{formatHours(share.total_hours)}</span>
                    <span className="text-stone-300 dark:text-stone-600">|</span>
                    <span>{share.entry_count} entries</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {share.submitted_at && (
                  <span className="hidden sm:flex items-center gap-1 text-xs text-stone-400">
                    <Clock className="h-3 w-3" />
                    {new Date(share.submitted_at).toLocaleDateString()}
                  </span>
                )}
                <button
                  onClick={() => setReviewShare(share)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
                >
                  <ClipboardCheck className="h-3 w-3" />
                  Review
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {reviewShare && (
        <ReviewDialog
          open={!!reviewShare}
          onOpenChange={(open) => !open && setReviewShare(null)}
          share={reviewShare}
          groupId={groupId}
          onReviewed={() => {
            setReviewShare(null)
            fetchShares()
          }}
        />
      )}
    </>
  )
}
