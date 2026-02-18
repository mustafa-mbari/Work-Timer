'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition, useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { TimeEntryPage, TimeEntry } from '@/lib/repositories/timeEntries'
import type { ProjectSummary } from '@/lib/repositories/projects'
import type { TimeEntryFilters } from '@/lib/repositories/timeEntries'
import EntryFormDialog from './EntryFormDialog'

interface Props {
  entriesPage: TimeEntryPage
  projects: ProjectSummary[]
  filters: TimeEntryFilters
}

function formatDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / 60000)
  const hours = Math.floor(totalMin / 60)
  const mins = totalMin % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

const TYPE_BADGE: Record<TimeEntry['type'], { label: string; class: string }> = {
  manual: {
    label: 'Manual',
    class: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  },
  stopwatch: {
    label: 'Stopwatch',
    class: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  },
  pomodoro: {
    label: 'Pomodoro',
    class: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  },
}

export default function EntriesTable({ entriesPage, projects, filters }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const projectMap = new Map(projects.map(p => [p.id, p]))
  const { data: entries, page, totalPages } = entriesPage

  function navigate(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(params)) {
      if (v) sp.set(k, v)
      else sp.delete(k)
    }
    startTransition(() => {
      router.push(`/entries?${sp.toString()}`)
    })
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === entries.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(entries.map(e => e.id)))
    }
  }

  async function handleDelete(ids: string[]) {
    setIsBusy(true)
    try {
      const res = await fetch('/api/entries', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Delete failed')
      } else {
        toast.success(ids.length === 1 ? 'Entry deleted' : `${ids.length} entries deleted`)
        setSelected(new Set())
        router.refresh()
      }
    } catch {
      toast.error('Network error')
    } finally {
      setIsBusy(false)
      setDeleteIds(null)
    }
  }

  function handleSaved() {
    router.refresh()
  }

  return (
    <>
      {/* Empty state */}
      {entries.length === 0 && (
        <div className="rounded-xl border border-stone-200 dark:border-[var(--dark-border)] py-16 flex flex-col items-center gap-3 text-center mb-4">
          <div className="h-12 w-12 rounded-full bg-stone-100 dark:bg-[var(--dark-elevated)] flex items-center justify-center">
            <svg className="h-6 w-6 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-stone-900 dark:text-stone-100">No entries found</p>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
              {filters.dateFrom || filters.dateTo || filters.projectId || filters.type
                ? 'Try adjusting your filters.'
                : 'Start the timer in the extension to create entries.'}
            </p>
          </div>
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="mt-2">
            Add manually
          </Button>
        </div>
      )}

      {entries.length > 0 && <>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 px-4 py-2.5">
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
            {selected.size} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-stone-600 dark:text-stone-300"
            onClick={() => setSelected(new Set())}
          >
            Deselect all
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-7 ml-auto"
            disabled={isBusy}
            onClick={() => setDeleteIds([...selected])}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Delete {selected.size}
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-stone-200 dark:border-[var(--dark-border)] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50 dark:bg-[var(--dark-card)] text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={selected.size === entries.length && entries.length > 0}
                  ref={el => {
                    if (el) el.indeterminate = selected.size > 0 && selected.size < entries.length
                  }}
                  onChange={toggleAll}
                  className="rounded border-stone-300 dark:border-stone-600"
                  aria-label="Select all"
                />
              </th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3 max-w-xs">Description</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 w-20 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-[var(--dark-border)]">
            {entries.map((entry, i) => {
              const project = entry.project_id ? projectMap.get(entry.project_id) : null
              const badge = TYPE_BADGE[entry.type]
              const isSelected = selected.has(entry.id)

              return (
                <tr
                  key={entry.id}
                  className={`transition-colors ${
                    isSelected
                      ? 'bg-indigo-50/60 dark:bg-indigo-900/10'
                      : i % 2 === 0
                      ? 'bg-white dark:bg-[var(--dark)]'
                      : 'bg-stone-50/50 dark:bg-[var(--dark-card)]/40'
                  } hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)]`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(entry.id)}
                      className="rounded border-stone-300 dark:border-stone-600"
                      aria-label={`Select entry ${entry.id}`}
                    />
                  </td>
                  <td className="px-4 py-3 text-stone-700 dark:text-stone-300 whitespace-nowrap">
                    {formatDate(entry.date)}
                  </td>
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-400 whitespace-nowrap tabular-nums">
                    {formatTime(entry.start_time)} – {formatTime(entry.end_time)}
                  </td>
                  <td className="px-4 py-3 text-stone-700 dark:text-stone-300 whitespace-nowrap tabular-nums font-medium">
                    {formatDuration(entry.duration)}
                  </td>
                  <td className="px-4 py-3">
                    {project ? (
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: project.color }}
                        />
                        <span className="text-stone-700 dark:text-stone-300 truncate max-w-[120px]">
                          {project.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-stone-400 dark:text-stone-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <span
                      className="text-stone-700 dark:text-stone-300 truncate block max-w-[200px]"
                      title={entry.description}
                    >
                      {entry.description || (
                        <span className="text-stone-400 dark:text-stone-600 italic">No description</span>
                      )}
                    </span>
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {entry.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="text-xs bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded px-1.5 py-0.5"
                          >
                            {tag}
                          </span>
                        ))}
                        {entry.tags.length > 3 && (
                          <span className="text-xs text-stone-400">+{entry.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.class}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditEntry(entry)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/20 transition-colors"
                        aria-label="Edit entry"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteIds([entry.id])}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-900/20 transition-colors"
                        aria-label="Delete entry"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      </>}

      {/* Pagination — always visible when there are entries */}
      {entriesPage.total > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Page {page} of {totalPages} · {entriesPage.total} {entriesPage.total === 1 ? 'entry' : 'entries'}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => navigate({ page: String(page - 1) })}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4))
              const p = start + i
              return (
                <Button
                  key={p}
                  variant={p === page ? 'default' : 'ghost'}
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={() => navigate({ page: String(p) })}
                >
                  {p}
                </Button>
              )
            })}
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => navigate({ page: String(page + 1) })}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      <EntryFormDialog
        open={!!editEntry}
        onOpenChange={open => { if (!open) setEditEntry(null) }}
        entry={editEntry ?? undefined}
        projects={projects}
        onSaved={handleSaved}
      />

      {/* Add dialog (triggered from empty state or bulk bar) */}
      <EntryFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        projects={projects}
        onSaved={handleSaved}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteIds} onOpenChange={open => { if (!open) setDeleteIds(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteIds?.length === 1 ? 'entry' : `${deleteIds?.length} entries`}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The{' '}
              {deleteIds?.length === 1 ? 'entry' : 'entries'} will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => deleteIds && handleDelete(deleteIds)}
              disabled={isBusy}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
