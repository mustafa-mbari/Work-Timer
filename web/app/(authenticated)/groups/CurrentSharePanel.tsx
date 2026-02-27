'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Send, AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import type { GroupShare, SnapshotEntry } from '@/lib/repositories/groupShares'
import { formatPeriod, formatHours } from './utils'
import type { ProjectItem, TagItem } from './utils'

interface Props {
  groupId: string
  projects: ProjectItem[]
  tags: TagItem[]
  hasSchedule: boolean
}

function periodLabel(type: string): string {
  return type === 'day' ? 'Daily' : type === 'week' ? 'Weekly' : 'Monthly'
}

// ─── ShareCard (self-contained per share) ──────────────────────────────────

function ShareCard({ share, groupId, projects, onSubmitted }: {
  share: GroupShare
  groupId: string
  projects: ProjectItem[]
  onSubmitted: () => void
}) {
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[] | null>(null)
  const [previewData, setPreviewData] = useState<{ entry_count: number; total_hours: number } | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Preview entries count for open shares (debounced on project filter changes)
  useEffect(() => {
    if (share.status !== 'open') return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPreviewing(true)
      fetch(`/api/groups/${groupId}/shares/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period_type: share.period_type,
          date_from: share.date_from,
          date_to: share.date_to,
          project_ids: selectedProjectIds,
          tag_ids: null,
        }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setPreviewData(data) })
        .finally(() => setPreviewing(false))
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [groupId, share.id, share.status, share.period_type, share.date_from, share.date_to, selectedProjectIds])

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/shares/${share.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_ids: selectedProjectIds,
          tag_ids: null,
        }),
      })
      if (res.ok) onSubmitted()
    } finally {
      setSubmitting(false)
    }
  }

  function toggleProject(id: string) {
    if (selectedProjectIds === null) {
      setSelectedProjectIds(projects.filter(p => p.id !== id).map(p => p.id))
    } else if (selectedProjectIds.includes(id)) {
      const next = selectedProjectIds.filter(p => p !== id)
      setSelectedProjectIds(next.length === 0 ? null : next)
    } else {
      const next = [...selectedProjectIds, id]
      setSelectedProjectIds(next.length === projects.length ? null : next)
    }
  }

  // ── Submitted state ──
  if (share.status === 'submitted') {
    const entries = (share.entries || []) as SnapshotEntry[]
    return (
      <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
              {periodLabel(share.period_type)} Share
            </p>
            <p className="text-xs text-stone-400">{formatPeriod(share)}</p>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300">
            Waiting for review
          </span>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 rounded-lg bg-stone-50 dark:bg-[var(--dark-elevated)] p-3 text-center">
            <p className="text-lg font-bold text-stone-800 dark:text-stone-100 tabular-nums">{formatHours(share.total_hours)}</p>
            <p className="text-xs text-stone-400">Hours</p>
          </div>
          <div className="flex-1 rounded-lg bg-stone-50 dark:bg-[var(--dark-elevated)] p-3 text-center">
            <p className="text-lg font-bold text-stone-800 dark:text-stone-100">{entries.length}</p>
            <p className="text-xs text-stone-400">Entries</p>
          </div>
        </div>
        <p className="text-xs text-stone-400 text-center">
          Submitted {share.submitted_at ? new Date(share.submitted_at).toLocaleDateString() : ''}. Your admin will review and approve or deny this share.
        </p>
      </div>
    )
  }

  // ── Open state (with optional denied comment) ──
  return (
    <div className="space-y-3">
      {share.admin_comment && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 p-4 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Share was returned by admin</p>
            <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-1">{share.admin_comment}</p>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
              {periodLabel(share.period_type)} Share
            </p>
            <p className="text-xs text-stone-400">{formatPeriod(share)}</p>
          </div>
          {share.due_date && (
            <span className="text-xs text-stone-400">
              Due: {new Date(share.due_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        <div className="flex gap-3">
          <div className="flex-1 rounded-lg bg-stone-50 dark:bg-[var(--dark-elevated)] p-3 text-center">
            <p className="text-lg font-bold text-stone-800 dark:text-stone-100 tabular-nums">
              {previewing ? '...' : previewData ? formatHours(previewData.total_hours) : '0h'}
            </p>
            <p className="text-xs text-stone-400">Hours</p>
          </div>
          <div className="flex-1 rounded-lg bg-stone-50 dark:bg-[var(--dark-elevated)] p-3 text-center">
            <p className="text-lg font-bold text-stone-800 dark:text-stone-100">
              {previewing ? '...' : previewData?.entry_count ?? 0}
            </p>
            <p className="text-xs text-stone-400">Entries</p>
          </div>
        </div>

        {projects.length > 0 && (
          <div>
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-2">Include projects</p>
            <div className="flex flex-wrap gap-1.5">
              {projects.map(p => {
                const selected = selectedProjectIds === null || selectedProjectIds.includes(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleProject(p.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                      selected
                        ? 'bg-stone-50 dark:bg-[var(--dark-elevated)] border-stone-200 dark:border-[var(--dark-border)] text-stone-700 dark:text-stone-200'
                        : 'bg-white dark:bg-[var(--dark-card)] border-stone-100 dark:border-[var(--dark-border)] text-stone-400 opacity-50'
                    }`}
                  >
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting || (previewData?.entry_count === 0)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {submitting ? 'Submitting...' : 'Submit Share'}
        </button>

        {previewData?.entry_count === 0 && !previewing && (
          <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
            No entries found for this period. Track some time first.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Main Panel ─────────────────────────────────────────────────────────────

export default function CurrentSharePanel({ groupId, projects, tags, hasSchedule }: Props) {
  const [shares, setShares] = useState<GroupShare[]>([])
  const [loading, setLoading] = useState(true)

  const fetchShares = useCallback(async () => {
    setLoading(true)
    try {
      const [openRes, subRes] = await Promise.all([
        fetch(`/api/groups/${groupId}/shares?status=open&mine=true`),
        fetch(`/api/groups/${groupId}/shares?status=submitted&mine=true`),
      ])
      const open: GroupShare[] = openRes.ok ? await openRes.json() : []
      const submitted: GroupShare[] = subRes.ok ? await subRes.json() : []
      setShares([...open, ...submitted])
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => { fetchShares() }, [fetchShares])

  if (loading) {
    return (
      <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm p-8 text-center">
        <Loader2 className="h-6 w-6 text-indigo-500 animate-spin mx-auto" />
        <p className="text-sm text-stone-400 mt-2">Loading shares...</p>
      </div>
    )
  }

  // No shares at all
  if (shares.length === 0) {
    if (!hasSchedule) {
      return (
        <div className="rounded-xl border-2 border-dashed border-stone-200 dark:border-[var(--dark-border)] p-10 text-center">
          <Clock className="h-8 w-8 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-stone-600 dark:text-stone-300">No pending shares</p>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
            Your admin hasn&apos;t created any share requests yet.
          </p>
        </div>
      )
    }

    return (
      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 p-8 text-center">
        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">You&apos;re all caught up!</p>
        <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">
          No pending share requests at the moment.
        </p>
      </div>
    )
  }

  const openShares = shares.filter(s => s.status === 'open')
  const submittedShares = shares.filter(s => s.status === 'submitted')

  return (
    <div className="space-y-5">
      {/* Open shares */}
      {openShares.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            Open ({openShares.length})
          </h3>
          {openShares.map(share => (
            <ShareCard
              key={share.id}
              share={share}
              groupId={groupId}
              projects={projects}
              onSubmitted={fetchShares}
            />
          ))}
        </div>
      )}

      {/* Submitted shares */}
      {submittedShares.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            Submitted ({submittedShares.length})
          </h3>
          {submittedShares.map(share => (
            <ShareCard
              key={share.id}
              share={share}
              groupId={groupId}
              projects={projects}
              onSubmitted={fetchShares}
            />
          ))}
        </div>
      )}
    </div>
  )
}
