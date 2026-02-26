'use client'

import { useState, useMemo } from 'react'
import { X, Check, XCircle } from 'lucide-react'
import type { GroupShareWithMeta, SnapshotEntry } from '@/lib/repositories/groupShares'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  share: GroupShareWithMeta
  groupId: string
  onReviewed: () => void
}

function formatHours(h: number): string {
  return h < 10 ? h.toFixed(1) + 'h' : Math.round(h) + 'h'
}

function formatPeriod(share: GroupShareWithMeta): string {
  const from = new Date(share.date_from + 'T00:00:00')
  const to = new Date(share.date_to + 'T00:00:00')
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (share.period_type === 'day') return from.toLocaleDateString(undefined, opts)
  return `${from.toLocaleDateString(undefined, opts)} – ${to.toLocaleDateString(undefined, opts)}`
}

export default function ReviewDialog({ open, onOpenChange, share, groupId, onReviewed }: Props) {
  const [showDenyForm, setShowDenyForm] = useState(false)
  const [comment, setComment] = useState('')
  const [processing, setProcessing] = useState(false)

  const entries = (share.entries || []) as SnapshotEntry[]

  // Project breakdown
  const projectBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; color: string; ms: number }>()
    for (const e of entries) {
      const key = e.project_id || '__none__'
      const existing = map.get(key)
      if (existing) {
        existing.ms += e.duration
      } else {
        map.set(key, {
          name: e.project_name || 'No project',
          color: e.project_color || '#a8a29e',
          ms: e.duration,
        })
      }
    }
    const total = entries.reduce((s, e) => s + e.duration, 0)
    return [...map.values()]
      .sort((a, b) => b.ms - a.ms)
      .map(p => ({
        ...p,
        hours: Math.round((p.ms / 3_600_000) * 100) / 100,
        pct: total > 0 ? Math.round((p.ms / total) * 100) : 0,
      }))
  }, [entries])

  async function handleAction(action: 'approve' | 'deny') {
    if (action === 'deny' && !showDenyForm) {
      setShowDenyForm(true)
      return
    }
    if (action === 'deny' && !comment.trim()) return

    setProcessing(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/shares/${share.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, comment: action === 'deny' ? comment : undefined }),
      })
      if (res.ok) onReviewed()
    } finally {
      setProcessing(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-white dark:bg-[var(--dark-card)] rounded-2xl shadow-xl overflow-hidden flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-[var(--dark-border)]">
          <div>
            <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">
              Review: {share.sharer_name || share.sharer_email.split('@')[0]}
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              {formatPeriod(share)} &middot; Submitted {share.submitted_at ? new Date(share.submitted_at).toLocaleDateString() : ''}
            </p>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-[var(--dark-hover)] transition-colors">
            <X className="h-4 w-4 text-stone-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Summary */}
          <div className="flex gap-4">
            <div className="flex-1 rounded-xl bg-stone-50 dark:bg-[var(--dark-elevated)] p-3 text-center">
              <p className="text-lg font-bold text-stone-800 dark:text-stone-100">{formatHours(share.total_hours)}</p>
              <p className="text-xs text-stone-400">Total Hours</p>
            </div>
            <div className="flex-1 rounded-xl bg-stone-50 dark:bg-[var(--dark-elevated)] p-3 text-center">
              <p className="text-lg font-bold text-stone-800 dark:text-stone-100">{share.entry_count}</p>
              <p className="text-xs text-stone-400">Entries</p>
            </div>
          </div>

          {/* Project breakdown */}
          {projectBreakdown.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-2">Project Breakdown</h3>
              <div className="flex h-2 rounded-full overflow-hidden mb-3">
                {projectBreakdown.map((p, i) => (
                  <div key={i} style={{ width: `${p.pct}%`, backgroundColor: p.color }} className="min-w-[2px]" />
                ))}
              </div>
              <div className="space-y-1.5">
                {projectBreakdown.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="text-stone-700 dark:text-stone-200">{p.name}</span>
                    </div>
                    <span className="text-stone-500 dark:text-stone-400 tabular-nums">{p.hours}h ({p.pct}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Entry table */}
          {entries.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-2">Entries</h3>
              <div className="rounded-xl border border-stone-100 dark:border-[var(--dark-border)] overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-stone-50 dark:bg-[var(--dark-elevated)]">
                      <tr className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                        <th className="text-left px-3 py-2">Date</th>
                        <th className="text-left px-3 py-2">Description</th>
                        <th className="text-left px-3 py-2 hidden sm:table-cell">Project</th>
                        <th className="text-right px-3 py-2">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map(entry => (
                        <tr key={entry.id} className="border-t border-stone-50 dark:border-[var(--dark-border)]">
                          <td className="px-3 py-2 text-stone-600 dark:text-stone-300 whitespace-nowrap">
                            {new Date(entry.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </td>
                          <td className="px-3 py-2 text-stone-700 dark:text-stone-200 truncate max-w-[200px]">
                            {entry.description || '—'}
                          </td>
                          <td className="px-3 py-2 hidden sm:table-cell">
                            {entry.project_name ? (
                              <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.project_color ?? '#a8a29e' }} />
                                <span className="text-stone-600 dark:text-stone-300 truncate">{entry.project_name}</span>
                              </div>
                            ) : (
                              <span className="text-stone-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-stone-700 dark:text-stone-200 tabular-nums whitespace-nowrap">
                            {(entry.duration / 3_600_000).toFixed(1)}h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Note */}
          {share.note && (
            <div className="rounded-xl bg-stone-50 dark:bg-[var(--dark-elevated)] p-3">
              <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Note from member</p>
              <p className="text-sm text-stone-700 dark:text-stone-200">{share.note}</p>
            </div>
          )}

          {/* Deny form */}
          {showDenyForm && (
            <div className="rounded-xl border border-rose-200 dark:border-rose-800/50 bg-rose-50 dark:bg-rose-900/10 p-4">
              <p className="text-sm font-medium text-rose-700 dark:text-rose-300 mb-2">Reason for denial (required)</p>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Explain why this submission needs changes..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200 dark:border-rose-800/50 bg-white dark:bg-[var(--dark-card)] text-stone-700 dark:text-stone-200 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 resize-none"
                rows={3}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-100 dark:border-[var(--dark-border)]">
          <button
            onClick={() => handleAction('deny')}
            disabled={processing || (showDenyForm && !comment.trim())}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 disabled:opacity-50 rounded-xl transition-colors"
          >
            <XCircle className="h-3.5 w-3.5" />
            {showDenyForm ? 'Confirm Deny' : 'Deny'}
          </button>
          {!showDenyForm && (
            <button
              onClick={() => handleAction('approve')}
              disabled={processing}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              Approve
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
