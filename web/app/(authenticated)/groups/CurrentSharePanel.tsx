'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Send, AlertCircle, CheckCircle2, Clock, Loader2, CalendarRange, FolderOpen } from 'lucide-react'
import type { GroupShare, SnapshotEntry } from '@/lib/repositories/groupShares'
import { formatPeriod, formatHours, periodLabel } from './utils'
import type { ProjectItem, TagItem } from './utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
  groupId: string
  projects: ProjectItem[]
  tags: TagItem[]
  hasSchedule: boolean
}

function formatDateRange(from: string, to: string): string {
  const f = new Date(from + 'T00:00:00')
  const t = new Date(to + 'T00:00:00')
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (from === to) return f.toLocaleDateString(undefined, { ...opts, year: 'numeric' })
  if (f.getFullYear() === t.getFullYear()) {
    return `${f.toLocaleDateString(undefined, opts)} – ${t.toLocaleDateString(undefined, { ...opts, year: 'numeric' })}`
  }
  return `${f.toLocaleDateString(undefined, { ...opts, year: 'numeric' })} – ${t.toLocaleDateString(undefined, { ...opts, year: 'numeric' })}`
}

// ─── Submit Dialog ──────────────────────────────────────────────────────────

export function SubmitDialog({
  open,
  share,
  groupId,
  projects,
  onClose,
  onSubmitted,
}: {
  open: boolean
  share: GroupShare
  groupId: string
  projects: ProjectItem[]
  onClose: () => void
  onSubmitted: () => void
}) {
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[] | null>(null)
  const [previewData, setPreviewData] = useState<{ entry_count: number; total_hours: number } | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedProjectIds(null)
      setPreviewData(null)
    }
  }, [open])

  // Preview entries (debounced on project filter changes)
  useEffect(() => {
    if (!open) return
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
  }, [open, groupId, share.period_type, share.date_from, share.date_to, selectedProjectIds])

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
      if (res.ok) {
        onSubmitted()
        onClose()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const includedProjectCount = selectedProjectIds === null
    ? projects.length
    : selectedProjectIds.length

  const isEmpty = previewData?.entry_count === 0 && !previewing

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Review &amp; Submit Timesheet</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Period header */}
          <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/30 px-4 py-3 flex items-start gap-3">
            <CalendarRange className="h-5 w-5 text-indigo-500 dark:text-indigo-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
                {periodLabel(share.period_type)} Timesheet
              </p>
              <p className="text-xs text-indigo-600 dark:text-indigo-300 mt-0.5">
                {formatDateRange(share.date_from, share.date_to)}
              </p>
              {share.due_date && (
                <p className="text-xs text-indigo-500/70 dark:text-indigo-400/70 mt-0.5">
                  Due by {new Date(share.due_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>

          {/* Admin comment if denied/returned */}
          {share.admin_comment && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 p-3.5 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Returned by admin</p>
                <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-1 leading-relaxed">{share.admin_comment}</p>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-stone-50 dark:bg-[var(--dark-elevated)] p-4 text-center">
              <p className={`text-2xl font-bold tabular-nums transition-opacity ${previewing ? 'opacity-40' : 'opacity-100'} text-stone-800 dark:text-stone-100`}>
                {previewData ? formatHours(previewData.total_hours) : previewing ? '…' : '0h'}
              </p>
              <p className="text-xs text-stone-400 mt-0.5">Total hours</p>
            </div>
            <div className="rounded-xl bg-stone-50 dark:bg-[var(--dark-elevated)] p-4 text-center">
              <p className={`text-2xl font-bold tabular-nums transition-opacity ${previewing ? 'opacity-40' : 'opacity-100'} text-stone-800 dark:text-stone-100`}>
                {previewing ? '…' : previewData?.entry_count ?? 0}
              </p>
              <p className="text-xs text-stone-400 mt-0.5">Time entries</p>
            </div>
          </div>

          {/* Project filter */}
          {projects.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <FolderOpen className="h-3.5 w-3.5 text-stone-400" />
                <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
                  Projects included
                  <span className="ml-1.5 text-stone-400 font-normal">
                    ({includedProjectCount} of {projects.length})
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {projects.map(p => {
                  const selected = selectedProjectIds === null || selectedProjectIds.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleProject(p.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-all ${
                        selected
                          ? 'bg-white dark:bg-[var(--dark-card)] border-stone-200 dark:border-[var(--dark-border)] text-stone-700 dark:text-stone-200 shadow-sm'
                          : 'bg-stone-50 dark:bg-[var(--dark-elevated)] border-stone-100 dark:border-[var(--dark-border)] text-stone-400 opacity-50'
                      }`}
                    >
                      <div className={`h-2 w-2 rounded-full transition-opacity ${selected ? 'opacity-100' : 'opacity-40'}`} style={{ backgroundColor: p.color }} />
                      {p.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Warning: no entries */}
          {isEmpty && (
            <div className="flex items-center gap-2 px-3.5 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                No time entries found for this period. Track some time first.
              </p>
            </div>
          )}

          {/* Info note */}
          {!isEmpty && !previewing && previewData && (
            <p className="text-xs text-stone-400 dark:text-stone-500 text-center leading-relaxed">
              Once submitted, your admin will review and approve or deny this timesheet.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 pt-1">
          <Button variant="outline" onClick={onClose} disabled={submitting} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || previewing || isEmpty}
            className="flex-1 sm:flex-none gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            {submitting
              ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting…</>
              : <><Send className="h-4 w-4" />Submit Timesheet</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Open Share Row ───────────────────────────────────────────────────────────

function OpenShareRow({ share, groupId, projects, onSubmitted }: {
  share: GroupShare
  groupId: string
  projects: ProjectItem[]
  onSubmitted: () => void
}) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const statusBadge = share.admin_comment ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 whitespace-nowrap">
      <AlertCircle className="h-3 w-3 shrink-0" /> Returned
    </span>
  ) : (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400">
      Open
    </span>
  )

  return (
    <>
      {/* Desktop table row */}
      <tr className="border-b border-stone-100 dark:border-[var(--dark-border)] last:border-0 hidden sm:table-row">
        <td className="py-3 pl-4 pr-3">
          <p className="text-sm font-medium text-stone-800 dark:text-stone-100 leading-tight">
            {periodLabel(share.period_type)}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">{formatPeriod(share)}</p>
        </td>
        <td className="py-3 pr-3 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
          {share.due_date
            ? new Date(share.due_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            : <span className="text-stone-300 dark:text-stone-600">—</span>
          }
        </td>
        <td className="py-3 pr-4">{statusBadge}</td>
        <td className="py-3 pr-4 text-right">
          <button
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <Send className="h-3 w-3" />
            Review &amp; Submit
          </button>
        </td>
      </tr>

      {/* Mobile card row */}
      <div className="sm:hidden border-b border-stone-100 dark:border-[var(--dark-border)] last:border-0 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-stone-800 dark:text-stone-100">
                {periodLabel(share.period_type)}
              </p>
              {statusBadge}
            </div>
            <p className="text-xs text-stone-400 mt-0.5">{formatPeriod(share)}</p>
            {share.due_date && (
              <p className="text-xs text-stone-400 mt-0.5">
                Due {new Date(share.due_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>
          <button
            onClick={() => setDialogOpen(true)}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            <Send className="h-3 w-3" />
            Submit
          </button>
        </div>
      </div>

      <SubmitDialog
        open={dialogOpen}
        share={share}
        groupId={groupId}
        projects={projects}
        onClose={() => setDialogOpen(false)}
        onSubmitted={onSubmitted}
      />
    </>
  )
}

// ─── Submitted Share Card ────────────────────────────────────────────────────

function SubmittedShareCard({ share }: { share: GroupShare }) {
  const entries = (share.entries || []) as SnapshotEntry[]
  return (
    <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
            {periodLabel(share.period_type)} Timesheet
          </p>
          <p className="text-xs text-stone-400 mt-0.5">{formatPeriod(share)}</p>
        </div>
        <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300">
          Waiting for review
        </span>
      </div>
      <div className="flex gap-3 mt-3">
        <div className="flex-1 rounded-lg bg-stone-50 dark:bg-[var(--dark-elevated)] p-3 text-center">
          <p className="text-base font-bold text-stone-800 dark:text-stone-100 tabular-nums">{formatHours(share.total_hours)}</p>
          <p className="text-xs text-stone-400">Hours</p>
        </div>
        <div className="flex-1 rounded-lg bg-stone-50 dark:bg-[var(--dark-elevated)] p-3 text-center">
          <p className="text-base font-bold text-stone-800 dark:text-stone-100">{entries.length || share.entry_count}</p>
          <p className="text-xs text-stone-400">Entries</p>
        </div>
      </div>
      <p className="text-xs text-stone-400 text-center mt-3">
        Submitted {share.submitted_at ? new Date(share.submitted_at).toLocaleDateString() : ''}. Your admin will review shortly.
      </p>
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
        <p className="text-sm text-stone-400 mt-2">Loading shares…</p>
      </div>
    )
  }

  const openShares = shares.filter(s => s.status === 'open')
  const submittedShares = shares.filter(s => s.status === 'submitted')

  if (openShares.length === 0 && submittedShares.length === 0) {
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

  return (
    <div className="space-y-5">
      {/* Open shares */}
      {openShares.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">
            Open ({openShares.length})
          </h3>
          <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm overflow-hidden">
            {/* Desktop: table */}
            <table className="w-full hidden sm:table">
              <thead>
                <tr className="border-b border-stone-100 dark:border-[var(--dark-border)] bg-stone-50 dark:bg-[var(--dark-elevated)]">
                  <th className="text-left text-xs font-medium text-stone-400 py-2.5 pl-4 pr-3">Period</th>
                  <th className="text-left text-xs font-medium text-stone-400 py-2.5 pr-3">Due</th>
                  <th className="text-left text-xs font-medium text-stone-400 py-2.5 pr-4">Status</th>
                  <th className="text-right text-xs font-medium text-stone-400 py-2.5 pr-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {openShares.map(share => (
                  <OpenShareRow
                    key={share.id}
                    share={share}
                    groupId={groupId}
                    projects={projects}
                    onSubmitted={fetchShares}
                  />
                ))}
              </tbody>
            </table>
            {/* Mobile: stacked cards */}
            <div className="sm:hidden">
              {openShares.map(share => (
                <OpenShareRow
                  key={share.id}
                  share={share}
                  groupId={groupId}
                  projects={projects}
                  onSubmitted={fetchShares}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Submitted shares */}
      {submittedShares.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            Submitted ({submittedShares.length})
          </h3>
          {submittedShares.map(share => (
            <SubmittedShareCard key={share.id} share={share} />
          ))}
        </div>
      )}
    </div>
  )
}
