'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Send, AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import type { GroupShare, SnapshotEntry } from '@/lib/repositories/groupShares'

interface ProjectItem { id: string; name: string; color: string }
interface TagItem { id: string; name: string; color: string }

interface Props {
  groupId: string
  projects: ProjectItem[]
  tags: TagItem[]
  hasSchedule: boolean
}

function formatPeriod(share: GroupShare): string {
  const from = new Date(share.date_from + 'T00:00:00')
  const to = new Date(share.date_to + 'T00:00:00')
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (share.period_type === 'day') return from.toLocaleDateString(undefined, opts)
  return `${from.toLocaleDateString(undefined, opts)} – ${to.toLocaleDateString(undefined, opts)}`
}

function formatHours(h: number): string {
  return h < 0.1 ? '0h' : h < 10 ? `${h.toFixed(1)}h` : `${Math.round(h)}h`
}

export default function CurrentSharePanel({ groupId, projects, tags, hasSchedule }: Props) {
  const [shares, setShares] = useState<GroupShare[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Project filter for submission
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[] | null>(null)
  const [selectedTagIds, setSelectedTagIds] = useState<string[] | null>(null)

  const fetchShares = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch open shares (triggers auto-creation if schedule is configured)
      const openRes = await fetch(`/api/groups/${groupId}/shares?status=open&mine=true`)
      const open: GroupShare[] = openRes.ok ? await openRes.json() : []

      // Also fetch submitted shares
      const subRes = await fetch(`/api/groups/${groupId}/shares?status=submitted&mine=true`)
      const submitted: GroupShare[] = subRes.ok ? await subRes.json() : []

      setShares([...open, ...submitted])
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => { fetchShares() }, [fetchShares])

  const currentShare = shares[0] ?? null

  // Preview entries count (from share preview endpoint)
  const [previewData, setPreviewData] = useState<{ entry_count: number; total_hours: number } | null>(null)
  const [previewing, setPreviewing] = useState(false)

  useEffect(() => {
    if (!currentShare || currentShare.status !== 'open') return
    setPreviewing(true)
    fetch(`/api/groups/${groupId}/shares/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        period_type: currentShare.period_type,
        date_from: currentShare.date_from,
        date_to: currentShare.date_to,
        project_ids: selectedProjectIds,
        tag_ids: selectedTagIds,
      }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setPreviewData(data) })
      .finally(() => setPreviewing(false))
  }, [groupId, currentShare, selectedProjectIds, selectedTagIds])

  async function handleSubmit() {
    if (!currentShare) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/shares/${currentShare.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_ids: selectedProjectIds,
          tag_ids: selectedTagIds,
        }),
      })
      if (res.ok) fetchShares()
    } finally {
      setSubmitting(false)
    }
  }

  // Toggle project filter
  function toggleProject(id: string) {
    if (selectedProjectIds === null) {
      // Switch from "all" to specific: all except this one
      setSelectedProjectIds(projects.filter(p => p.id !== id).map(p => p.id))
    } else if (selectedProjectIds.includes(id)) {
      const next = selectedProjectIds.filter(p => p !== id)
      setSelectedProjectIds(next.length === 0 ? null : next)
    } else {
      const next = [...selectedProjectIds, id]
      setSelectedProjectIds(next.length === projects.length ? null : next)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm p-8 text-center">
        <Loader2 className="h-6 w-6 text-indigo-500 animate-spin mx-auto" />
        <p className="text-sm text-stone-400 mt-2">Loading shares...</p>
      </div>
    )
  }

  // No schedule configured
  if (!hasSchedule && shares.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-stone-200 dark:border-[var(--dark-border)] p-10 text-center">
        <Clock className="h-8 w-8 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
        <p className="text-sm font-medium text-stone-600 dark:text-stone-300">No pending shares</p>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
          Ask your admin to configure a share schedule for the group.
        </p>
      </div>
    )
  }

  // All caught up
  if (shares.length === 0) {
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

  // Current share
  if (!currentShare) return null

  // Submitted state
  if (currentShare.status === 'submitted') {
    const entries = (currentShare.entries || []) as SnapshotEntry[]
    return (
      <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
              {currentShare.period_type === 'day' ? 'Daily' : currentShare.period_type === 'week' ? 'Weekly' : 'Monthly'} Share
            </p>
            <p className="text-xs text-stone-400">{formatPeriod(currentShare)}</p>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300">
            Waiting for review
          </span>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 rounded-lg bg-stone-50 dark:bg-[var(--dark-elevated)] p-3 text-center">
            <p className="text-lg font-bold text-stone-800 dark:text-stone-100 tabular-nums">{formatHours(currentShare.total_hours)}</p>
            <p className="text-xs text-stone-400">Hours</p>
          </div>
          <div className="flex-1 rounded-lg bg-stone-50 dark:bg-[var(--dark-elevated)] p-3 text-center">
            <p className="text-lg font-bold text-stone-800 dark:text-stone-100">{entries.length}</p>
            <p className="text-xs text-stone-400">Entries</p>
          </div>
        </div>
        <p className="text-xs text-stone-400 text-center">
          Submitted {currentShare.submitted_at ? new Date(currentShare.submitted_at).toLocaleDateString() : ''}. Your admin will review and approve or deny this share.
        </p>
      </div>
    )
  }

  // Open share (with optional denied comment)
  return (
    <div className="space-y-4">
      {/* Denied warning */}
      {currentShare.admin_comment && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 p-4 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Share was returned by admin</p>
            <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-1">{currentShare.admin_comment}</p>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
              {currentShare.period_type === 'day' ? 'Daily' : currentShare.period_type === 'week' ? 'Weekly' : 'Monthly'} Share
            </p>
            <p className="text-xs text-stone-400">{formatPeriod(currentShare)}</p>
          </div>
          {currentShare.due_date && (
            <span className="text-xs text-stone-400">
              Due: {new Date(currentShare.due_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        {/* Preview stats */}
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

        {/* Project filter */}
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

        {/* Submit button */}
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
