'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition, useState } from 'react'
import { Plus, Search, X, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ProjectSummary } from '@/lib/repositories/projects'
import type { TimeEntryFilters } from '@/lib/repositories/timeEntries'

interface Props {
  projects: ProjectSummary[]
  filters: TimeEntryFilters
  onAddEntry?: () => void
  allColumns?: { id: string; label: string }[]
  visibleCols?: Record<string, boolean>
  onToggleColumn?: (id: string) => void
}

export default function EntryFilters({ projects, filters, onAddEntry, allColumns, visibleCols, onToggleColumn }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const [dateFrom, setDateFrom] = useState(filters.dateFrom ?? '')
  const [dateTo, setDateTo] = useState(filters.dateTo ?? '')

  function navigate(updates: Record<string, string | undefined>) {
    const sp = new URLSearchParams(searchParams.toString())
    // Always reset to page 1 when filters change
    sp.delete('page')
    for (const [k, v] of Object.entries(updates)) {
      if (v) sp.set(k, v)
      else sp.delete(k)
    }
    startTransition(() => {
      router.push(`/entries?${sp.toString()}`)
    })
  }

  function clearFilters() {
    setDateFrom('')
    setDateTo('')
    startTransition(() => {
      router.push('/entries')
    })
  }

  const hasFilters = !!(filters.dateFrom || filters.dateTo || filters.projectId || filters.type)

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Date from */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500 dark:text-stone-400">From</label>
        <Input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          onBlur={() => navigate({ dateFrom: dateFrom || undefined })}
          className="h-9 w-38 text-sm"
        />
      </div>

      {/* Date to */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500 dark:text-stone-400">To</label>
        <Input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          onBlur={() => navigate({ dateTo: dateTo || undefined })}
          className="h-9 w-38 text-sm"
        />
      </div>

      {/* Project */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500 dark:text-stone-400">Project</label>
        <select
          value={filters.projectId ?? ''}
          onChange={e => navigate({ projectId: e.target.value || undefined })}
          className="h-9 rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-900 dark:bg-[var(--dark-card)] dark:border-[var(--dark-border)] dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Type */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500 dark:text-stone-400">Type</label>
        <select
          value={filters.type ?? ''}
          onChange={e => navigate({ type: e.target.value || undefined })}
          className="h-9 rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-900 dark:bg-[var(--dark-card)] dark:border-[var(--dark-border)] dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All types</option>
          <option value="manual">Manual</option>
          <option value="stopwatch">Stopwatch</option>
          <option value="pomodoro">Pomodoro</option>
        </select>
      </div>

      {/* Clear */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-9 gap-1.5 text-stone-500"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}

      {/* Columns + Add entry buttons */}
      <div className="flex items-center gap-2 ml-auto">
        {allColumns && visibleCols && onToggleColumn && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-9 shrink-0">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Show / hide columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allColumns.map(c => (
                <DropdownMenuCheckboxItem
                  key={c.id}
                  checked={visibleCols[c.id] ?? true}
                  onCheckedChange={() => onToggleColumn(c.id)}
                >
                  {c.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button
          size="sm"
          className="h-9 gap-1.5"
          onClick={onAddEntry}
        >
          <Plus className="h-4 w-4" />
          Add Entry
        </Button>
      </div>

      {/* Active filter indicator */}
      {hasFilters && (
        <div className="w-full flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
          <Search className="h-3 w-3" />
          Filters active
          {filters.dateFrom && <span>· From {filters.dateFrom}</span>}
          {filters.dateTo && <span>· To {filters.dateTo}</span>}
          {filters.projectId && <span>· Project filtered</span>}
          {filters.type && <span>· {filters.type}</span>}
        </div>
      )}
    </div>
  )
}
