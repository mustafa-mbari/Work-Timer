'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { ClipboardCheck, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react'
import type { GroupShareWithMeta } from '@/lib/repositories/groupShares'
import ReviewDialog from './ReviewDialog'
import { formatPeriod, formatHours, formatIsoDate, getInitials } from './utils'

interface Props {
  groupId: string
}

type FilterTab = 'all' | 'submitted' | 'approved' | 'denied'

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    day: { label: 'Day', cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300' },
    week: { label: 'Week', cls: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' },
    month: { label: 'Month', cls: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' },
  }
  const { label, cls } = map[type] ?? { label: type, cls: 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'submitted':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"><Clock className="h-2.5 w-2.5" />Pending</span>
    case 'approved':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-2.5 w-2.5" />Approved</span>
    case 'denied':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300"><XCircle className="h-2.5 w-2.5" />Denied</span>
    default:
      return <span className="text-xs text-stone-400 dark:text-stone-500">—</span>
  }
}

export default function PendingReviewsPanel({ groupId }: Props) {
  const [allShares, setAllShares] = useState<GroupShareWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [reviewShare, setReviewShare] = useState<GroupShareWithMeta | null>(null)

  const fetchShares = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch all shares (admin gets all without mine=true and without status filter)
      const res = await fetch(`/api/groups/${groupId}/shares`)
      if (res.ok) {
        const data: GroupShareWithMeta[] = await res.json()
        // Exclude open shares — those live in the Schedule tab
        setAllShares(data.filter(s => s.status !== 'open'))
      }
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => { fetchShares() }, [fetchShares])

  const pendingCount = useMemo(() => allShares.filter(s => s.status === 'submitted').length, [allShares])

  const filtered = useMemo(() => {
    if (filter === 'all') return allShares
    if (filter === 'submitted') return allShares.filter(s => s.status === 'submitted')
    if (filter === 'approved') return allShares.filter(s => s.status === 'approved')
    if (filter === 'denied') return allShares.filter(s => s.status === 'denied')
    return allShares
  }, [allShares, filter])

  const filterTabs: { key: FilterTab; label: string; badge?: number }[] = [
    { key: 'all', label: 'All' },
    { key: 'submitted', label: 'Pending', badge: pendingCount },
    { key: 'approved', label: 'Approved' },
    { key: 'denied', label: 'Denied' },
  ]

  if (loading) {
    return (
      <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm overflow-hidden">
        <div className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-stone-200 dark:bg-stone-700" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-40 rounded bg-stone-200 dark:bg-stone-700" />
                <div className="h-2.5 w-24 rounded bg-stone-100 dark:bg-stone-800" />
              </div>
              <div className="h-5 w-16 rounded-full bg-stone-200 dark:bg-stone-700" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm overflow-hidden">
        {/* Filter tab bar */}
        <div className="flex border-b border-stone-100 dark:border-[var(--dark-border)] bg-stone-50/60 dark:bg-[var(--dark-elevated)]">
          {filterTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                filter === t.key
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
              }`}
            >
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <ClipboardCheck className="h-8 w-8 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
            <p className="text-sm text-stone-500 dark:text-stone-400">No shares found</p>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
              {filter === 'all'
                ? 'Submitted, approved, and denied shares will appear here.'
                : `No ${filter} shares yet.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 dark:border-[var(--dark-border)]">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Member</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Period</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider hidden sm:table-cell">Hours</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider hidden md:table-cell">Entries</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider hidden lg:table-cell">Date</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50 dark:divide-[var(--dark-border)]">
                {filtered.map(share => {
                  const dateLabel = share.status === 'submitted'
                    ? formatIsoDate(share.submitted_at)
                    : formatIsoDate(share.reviewed_at)
                  return (
                    <tr
                      key={share.id}
                      className="transition-colors hover:bg-stone-50/50 dark:hover:bg-[var(--dark-hover)]"
                    >
                      {/* Member */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-semibold text-indigo-700 dark:text-indigo-300 shrink-0">
                            {getInitials(share.sharer_name, share.sharer_email)}
                          </div>
                          <span className="text-sm font-medium text-stone-800 dark:text-stone-100 truncate">
                            {share.sharer_name || share.sharer_email.split('@')[0]}
                          </span>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3">
                        <TypeBadge type={share.period_type} />
                      </td>

                      {/* Period */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-stone-700 dark:text-stone-200 whitespace-nowrap">
                          {formatPeriod(share)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={share.status} />
                      </td>

                      {/* Hours */}
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span className="text-sm font-medium text-stone-700 dark:text-stone-200">
                          {formatHours(share.total_hours)}
                        </span>
                      </td>

                      {/* Entries */}
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className="text-sm text-stone-500 dark:text-stone-400">
                          {share.entry_count}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-right hidden lg:table-cell">
                        <span className="text-xs text-stone-400 dark:text-stone-500 whitespace-nowrap">
                          {dateLabel}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right">
                        {share.status === 'submitted' ? (
                          <button
                            onClick={() => setReviewShare(share)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap"
                          >
                            <ClipboardCheck className="h-3 w-3" />
                            Review
                          </button>
                        ) : (
                          <button
                            onClick={() => setReviewShare(share)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition-colors whitespace-nowrap"
                          >
                            <FileText className="h-3 w-3" />
                            View
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
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
