'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { ClipboardCheck, FileText } from 'lucide-react'
import type { GroupShareListItemWithMeta } from '@/lib/repositories/groupShares'
import { Button } from '@/components/ui/button'
import ReviewDialog from './ReviewDialog'
import { formatPeriod, formatHours, formatIsoDate } from './utils'
import { StatusBadge, TypeBadge } from './StatusBadge'
import { MemberAvatar } from './MemberAvatar'

interface Props {
  groupId: string
}

type FilterTab = 'all' | 'submitted' | 'approved' | 'denied'

export default function PendingReviewsPanel({ groupId }: Props) {
  const [allShares, setAllShares] = useState<GroupShareListItemWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [reviewShare, setReviewShare] = useState<GroupShareListItemWithMeta | null>(null)

  const fetchShares = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch all shares (admin gets all without mine=true and without status filter)
      const res = await fetch(`/api/groups/${groupId}/shares`)
      if (res.ok) {
        const data: GroupShareListItemWithMeta[] = await res.json()
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
        {/* Filter pills (Level 3 tabs) */}
        <div className="flex flex-wrap gap-1.5 px-4 py-3 bg-stone-50/60 dark:bg-[var(--dark-elevated)] border-b border-stone-100 dark:border-[var(--dark-border)]">
          {filterTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                filter === t.key
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                  : 'bg-white dark:bg-[var(--dark-card)] border-stone-200 dark:border-[var(--dark-border)] text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)]'
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
          <>
            {/* Desktop table */}
            <div className="overflow-x-auto hidden sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 dark:border-[var(--dark-border)]">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Member</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Period</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Status</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Hours</th>
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
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <MemberAvatar name={share.sharer_name} email={share.sharer_email} size="md" />
                            <span className="text-sm font-medium text-stone-800 dark:text-stone-100 truncate">
                              {share.sharer_name || share.sharer_email.split('@')[0]}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <TypeBadge type={share.period_type} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-stone-700 dark:text-stone-200 whitespace-nowrap">
                            {formatPeriod(share)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={share.status} showIcon />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-medium text-stone-700 dark:text-stone-200">
                            {formatHours(share.total_hours)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right hidden md:table-cell">
                          <span className="text-sm text-stone-500 dark:text-stone-400">
                            {share.entry_count}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right hidden lg:table-cell">
                          <span className="text-xs text-stone-400 dark:text-stone-500 whitespace-nowrap">
                            {dateLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {share.status === 'submitted' ? (
                            <Button
                              size="sm"
                              onClick={() => setReviewShare(share)}
                              className="gap-1 text-xs bg-indigo-600 hover:bg-indigo-700"
                            >
                              <ClipboardCheck className="h-3 w-3" />
                              Review
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setReviewShare(share)}
                              className="gap-1 text-xs"
                            >
                              <FileText className="h-3 w-3" />
                              View
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-stone-100 dark:divide-[var(--dark-border)]">
              {filtered.map(share => (
                <div key={share.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MemberAvatar name={share.sharer_name} email={share.sharer_email} size="md" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-stone-800 dark:text-stone-100 truncate">
                          {share.sharer_name || share.sharer_email.split('@')[0]}
                        </p>
                        <p className="text-xs text-stone-400 mt-0.5">{formatPeriod(share)}</p>
                      </div>
                    </div>
                    <StatusBadge status={share.status} showIcon />
                  </div>
                  <div className="flex items-center justify-between mt-2.5 pl-9">
                    <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
                      <span className="font-medium text-stone-700 dark:text-stone-200">{formatHours(share.total_hours)}</span>
                      <span>{share.entry_count} entries</span>
                    </div>
                    {share.status === 'submitted' ? (
                      <Button
                        size="sm"
                        onClick={() => setReviewShare(share)}
                        className="gap-1 text-xs bg-indigo-600 hover:bg-indigo-700"
                      >
                        <ClipboardCheck className="h-3 w-3" />
                        Review
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setReviewShare(share)}
                        className="gap-1 text-xs"
                      >
                        <FileText className="h-3 w-3" />
                        View
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
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
