'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition, useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2, ChevronLeft, ChevronRight, ExternalLink, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
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
import type { TagSummary } from '@/lib/repositories/tags'
import EntryFormDialog from './EntryFormDialog'

interface Props {
  entriesPage: TimeEntryPage
  projects: ProjectSummary[]
  tags: TagSummary[]
  filters: TimeEntryFilters
  visibleCols: Record<ColumnId, boolean>
}

export const COLUMNS_STORAGE_KEY = 'entries-table-columns'
const GROUPBY_STORAGE_KEY = 'entries-table-groupby'

export type ColumnId = 'date' | 'time' | 'duration' | 'project' | 'description' | 'tags' | 'link' | 'type'

export const ALL_COLUMNS: { id: ColumnId; label: string }[] = [
  { id: 'date', label: 'Date' },
  { id: 'time', label: 'Time' },
  { id: 'duration', label: 'Duration' },
  { id: 'project', label: 'Project' },
  { id: 'description', label: 'Description' },
  { id: 'tags', label: 'Tags' },
  { id: 'link', label: 'Link' },
  { id: 'type', label: 'Type' },
]

export const DEFAULT_VISIBLE: Record<ColumnId, boolean> = {
  date: true,
  time: true,
  duration: true,
  project: true,
  description: true,
  tags: true,
  link: true,
  type: true,
}

export function loadColumnPrefs(): Record<ColumnId, boolean> {
  if (typeof window === 'undefined') return DEFAULT_VISIBLE
  try {
    const raw = localStorage.getItem(COLUMNS_STORAGE_KEY)
    if (!raw) return DEFAULT_VISIBLE
    return { ...DEFAULT_VISIBLE, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_VISIBLE
  }
}

function loadGroupByPrefs(): { col: ColumnId | null; dir: 'asc' | 'desc' } {
  if (typeof window === 'undefined') return { col: null, dir: 'asc' }
  try {
    const raw = localStorage.getItem(GROUPBY_STORAGE_KEY)
    if (!raw) return { col: null, dir: 'asc' }
    return JSON.parse(raw)
  } catch {
    return { col: null, dir: 'asc' }
  }
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

function formatLinkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url.length > 28 ? url.slice(0, 28) + '…' : url
  }
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

function getGroupKey(
  entry: TimeEntry,
  col: ColumnId,
  projectMap: Map<string, ProjectSummary>,
  tagMap: Map<string, string>,
): string {
  switch (col) {
    case 'date':
      return formatDate(entry.date)
    case 'project': {
      const p = entry.project_id ? projectMap.get(entry.project_id) : null
      return p?.name ?? 'No Project'
    }
    case 'type':
      return TYPE_BADGE[entry.type].label
    case 'tags': {
      const firstId = entry.tags?.[0]
      return firstId ? (tagMap.get(firstId) ?? firstId) : 'No Tags'
    }
    case 'duration': {
      const h = Math.floor(entry.duration / 3_600_000)
      return `${h}–${h + 1} h`
    }
    case 'time': {
      const hour = String(new Date(entry.start_time).getHours()).padStart(2, '0')
      return `${hour}:00`
    }
    case 'description':
      return entry.description?.slice(0, 20) || 'No description'
    case 'link':
      return entry.link ? formatLinkHost(entry.link) : 'No link'
    default:
      return '—'
  }
}

interface EntryGroup {
  label: string
  entries: TimeEntry[]
}

function buildGroups(
  entries: TimeEntry[],
  col: ColumnId,
  dir: 'asc' | 'desc',
  projectMap: Map<string, ProjectSummary>,
  tagMap: Map<string, string>,
): EntryGroup[] {
  // Collect unique group labels preserving entry-natural order, then sort
  const keyOf = (e: TimeEntry) => getGroupKey(e, col, projectMap, tagMap)

  const sorted = [...entries].sort((a, b) => {
    const ka = keyOf(a)
    const kb = keyOf(b)
    const cmp = ka.localeCompare(kb, undefined, { numeric: true, sensitivity: 'base' })
    return dir === 'asc' ? cmp : -cmp
  })

  const groups: EntryGroup[] = []
  for (const entry of sorted) {
    const label = keyOf(entry)
    const last = groups[groups.length - 1]
    if (last && last.label === label) {
      last.entries.push(entry)
    } else {
      groups.push({ label, entries: [entry] })
    }
  }
  return groups
}

export default function EntriesTable({ entriesPage, projects, tags, filters, visibleCols }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  // Grouping state
  const [groupCol, setGroupCol] = useState<ColumnId | null>(null)
  const [groupDir, setGroupDir] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    const prefs = loadGroupByPrefs()
    setGroupCol(prefs.col)
    setGroupDir(prefs.dir)
  }, [])

  function cycleGroup(col: ColumnId) {
    let nextCol: ColumnId | null
    let nextDir: 'asc' | 'desc'

    if (groupCol !== col) {
      nextCol = col
      nextDir = 'asc'
    } else if (groupDir === 'asc') {
      nextCol = col
      nextDir = 'desc'
    } else {
      nextCol = null
      nextDir = 'asc'
    }

    setGroupCol(nextCol)
    setGroupDir(nextDir)
    localStorage.setItem(GROUPBY_STORAGE_KEY, JSON.stringify({ col: nextCol, dir: nextDir }))
  }

  const projectMap = new Map(projects.map(p => [p.id, p]))
  const tagMap = new Map(tags.map(t => [t.id, t.name]))
  const { data: entries, page, totalPages } = entriesPage

  // Build groups or flat list
  const groups: EntryGroup[] | null = groupCol
    ? buildGroups(entries, groupCol, groupDir, projectMap, tagMap)
    : null

  // Flat list of entries for checkbox logic
  const allEntries = groups ? groups.flatMap(g => g.entries) : entries

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
    if (selected.size === allEntries.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allEntries.map(e => e.id)))
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

  const col = visibleCols

  // Column header with sort/group indicator
  function ColHeader({ id, label, className }: { id: ColumnId; label: string; className?: string }) {
    const isActive = groupCol === id
    return (
      <th
        className={`px-4 py-3 cursor-pointer select-none group ${className ?? ''}`}
        onClick={() => cycleGroup(id)}
        title={isActive ? `Grouped by ${label} (${groupDir})` : `Group by ${label}`}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <span className={`transition-colors ${isActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-stone-300 dark:text-stone-600 group-hover:text-stone-400'}`}>
            {isActive && groupDir === 'asc' ? (
              <ChevronUp className="h-3 w-3" />
            ) : isActive && groupDir === 'desc' ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronsUpDown className="h-3 w-3" />
            )}
          </span>
        </span>
      </th>
    )
  }

  function renderRow(entry: TimeEntry, i: number) {
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
        {col.date && (
          <td className="px-4 py-3 text-stone-700 dark:text-stone-300">
            {formatDate(entry.date)}
          </td>
        )}
        {col.time && (
          <td className="px-4 py-3 text-stone-600 dark:text-stone-400 tabular-nums">
            {formatTime(entry.start_time)} – {formatTime(entry.end_time)}
          </td>
        )}
        {col.duration && (
          <td className="px-4 py-3 text-stone-700 dark:text-stone-300 tabular-nums font-medium">
            {formatDuration(entry.duration)}
          </td>
        )}
        {col.project && (
          <td className="px-4 py-3">
            {project ? (
              <div className="flex items-center gap-1.5 min-w-[80px]">
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: project.color }}
                />
                <span className="text-stone-700 dark:text-stone-300 truncate">
                  {project.name}
                </span>
              </div>
            ) : (
              <span className="text-stone-400 dark:text-stone-600">—</span>
            )}
          </td>
        )}
        {col.description && (
          <td className="px-4 py-3 min-w-[100px]">
            <span
              className="text-stone-700 dark:text-stone-300 truncate block"
              title={entry.description}
            >
              {entry.description || (
                <span className="text-stone-400 dark:text-stone-600 italic">No description</span>
              )}
            </span>
          </td>
        )}
        {col.tags && (
          <td className="px-4 py-3">
            {entry.tags && entry.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {entry.tags.slice(0, 3).map(tagId => {
                  const name = tagMap.get(tagId) ?? tagId
                  return (
                    <span
                      key={tagId}
                      className="text-xs bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded px-1.5 py-0.5"
                    >
                      {name}
                    </span>
                  )
                })}
                {entry.tags.length > 3 && (
                  <span
                    className="text-xs text-stone-400 dark:text-stone-500 self-center cursor-default"
                    title={entry.tags.slice(3).map(id => tagMap.get(id) ?? id).join(', ')}
                  >
                    +{entry.tags.length - 3}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-stone-400 dark:text-stone-600">—</span>
            )}
          </td>
        )}
        {col.link && (
          <td className="px-4 py-3">
            {entry.link ? (
              <a
                href={entry.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline max-w-[140px]"
                title={entry.link}
              >
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                <span className="truncate text-xs">{formatLinkHost(entry.link)}</span>
              </a>
            ) : (
              <span className="text-stone-400 dark:text-stone-600">—</span>
            )}
          </td>
        )}
        {col.type && (
          <td className="px-4 py-3">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.class}`}>
              {badge.label}
            </span>
          </td>
        )}
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
  }

  // Count total visible columns for group header colspan
  const visibleColCount = ALL_COLUMNS.filter(c => col[c.id]).length + 2 // +2 for checkbox + actions

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

      {entries.length > 0 && (
        <>
          {/* Toolbar: bulk actions */}
          {selected.size > 0 && (
            <div className="mb-3 flex items-center gap-3">
              <div className="flex-1 flex items-center gap-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 px-4 py-2.5">
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
            </div>
          )}

          {/* Group-by indicator */}
          {groupCol && (
            <div className="mb-2 flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
              <span>Grouped by <span className="font-medium text-indigo-600 dark:text-indigo-400">{ALL_COLUMNS.find(c => c.id === groupCol)?.label}</span></span>
              <button
                onClick={() => {
                  setGroupCol(null)
                  setGroupDir('asc')
                  localStorage.setItem(GROUPBY_STORAGE_KEY, JSON.stringify({ col: null, dir: 'asc' }))
                }}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 underline"
              >
                Clear
              </button>
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
                      checked={selected.size === allEntries.length && allEntries.length > 0}
                      ref={el => {
                        if (el) el.indeterminate = selected.size > 0 && selected.size < allEntries.length
                      }}
                      onChange={toggleAll}
                      className="rounded border-stone-300 dark:border-stone-600"
                      aria-label="Select all"
                    />
                  </th>
                  {col.date && <ColHeader id="date" label="Date" />}
                  {col.time && <ColHeader id="time" label="Time" />}
                  {col.duration && <ColHeader id="duration" label="Duration" />}
                  {col.project && <ColHeader id="project" label="Project" />}
                  {col.description && <ColHeader id="description" label="Description" />}
                  {col.tags && <ColHeader id="tags" label="Tags" />}
                  {col.link && <ColHeader id="link" label="Link" />}
                  {col.type && <ColHeader id="type" label="Type" />}
                  <th className="px-4 py-3 w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-[var(--dark-border)]">
                {groups
                  ? groups.map(group =>
                      group.entries.map((entry, i) => {
                        const isFirst = i === 0
                        return (
                          <>
                            {isFirst && (
                              <tr key={`group-${group.label}`} className="bg-indigo-50/60 dark:bg-indigo-900/10">
                                <td colSpan={visibleColCount} className="px-4 py-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-indigo-700 dark:text-indigo-300 text-xs uppercase tracking-wider">
                                      {group.label}
                                    </span>
                                    <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full px-2 py-0.5 font-medium">
                                      {group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            )}
                            {renderRow(entry, i)}
                          </>
                        )
                      })
                    )
                  : entries.map((entry, i) => renderRow(entry, i))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Pagination */}
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
        tags={tags}
        onSaved={handleSaved}
      />

      {/* Add dialog (triggered from empty state) */}
      <EntryFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        projects={projects}
        tags={tags}
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
