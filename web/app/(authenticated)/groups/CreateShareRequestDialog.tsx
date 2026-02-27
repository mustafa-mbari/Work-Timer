'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus, Calendar, CheckCircle2 } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: string
  onCreated: () => void
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type PeriodType = 'day' | 'week' | 'month'
type QuickRange = 'today' | 'this-week' | 'last-week' | 'this-month' | 'last-month'

function getQuickRange(type: QuickRange): { from: string; to: string; period: PeriodType } {
  const now = new Date()
  if (type === 'today') {
    const today = formatDate(now)
    return { from: today, to: today, period: 'day' }
  }
  if (type === 'this-week') {
    const mon = new Date(now)
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    return { from: formatDate(mon), to: formatDate(sun), period: 'week' }
  }
  if (type === 'last-week') {
    const mon = new Date(now)
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7) - 7)
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    return { from: formatDate(mon), to: formatDate(sun), period: 'week' }
  }
  if (type === 'this-month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1)
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { from: formatDate(first), to: formatDate(last), period: 'month' }
  }
  // last-month
  const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const last = new Date(now.getFullYear(), now.getMonth(), 0)
  return { from: formatDate(first), to: formatDate(last), period: 'month' }
}

const QUICK_RANGES: { key: QuickRange; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'this-week', label: 'This Week' },
  { key: 'last-week', label: 'Last Week' },
  { key: 'this-month', label: 'This Month' },
  { key: 'last-month', label: 'Last Month' },
]

export default function CreateShareRequestDialog({ open, onOpenChange, groupId, onCreated }: Props) {
  const [periodType, setPeriodType] = useState<PeriodType>('week')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function applyQuickRange(type: QuickRange) {
    const range = getQuickRange(type)
    setDateFrom(range.from)
    setDateTo(range.to)
    setPeriodType(range.period)
    setResult(null)
    setError(null)
  }

  function handlePeriodChange(p: PeriodType) {
    setPeriodType(p)
    // If day mode, sync dateTo = dateFrom
    if (p === 'day' && dateFrom) setDateTo(dateFrom)
    setResult(null)
    setError(null)
  }

  function handleDateFromChange(val: string) {
    setDateFrom(val)
    if (periodType === 'day') setDateTo(val)
    setResult(null)
    setError(null)
  }

  async function handleCreate() {
    if (!dateFrom || !dateTo) return
    setCreating(true)
    setResult(null)
    setError(null)

    try {
      const res = await fetch(`/api/groups/${groupId}/shares/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period_type: periodType,
          date_from: dateFrom,
          date_to: dateTo,
          due_date: dueDate || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create share requests')
        return
      }

      setResult({ created: data.created, skipped: data.skipped })
      if (data.created > 0) onCreated()
    } finally {
      setCreating(false)
    }
  }

  function handleClose() {
    onOpenChange(false)
    setResult(null)
    setError(null)
  }

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-[var(--dark-card)] rounded-2xl shadow-2xl overflow-hidden flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-[var(--dark-border)]">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">Create Share Request</h2>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-[var(--dark-hover)] transition-colors">
            <X className="h-4 w-4 text-stone-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Create a share request for all members with sharing enabled. Each member will see an open request to fill and submit.
          </p>

          {/* Period type */}
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Period type</label>
            <div className="flex gap-2">
              {(['day', 'week', 'month'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    periodType === p
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                      : 'bg-white dark:bg-[var(--dark-elevated)] border-stone-200 dark:border-[var(--dark-border)] text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)]'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Quick ranges */}
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Quick select</label>
            <div className="flex flex-wrap gap-2">
              {QUICK_RANGES.map(r => (
                <button
                  key={r.key}
                  onClick={() => applyQuickRange(r.key)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-elevated)] text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)] transition-colors"
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">From</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400 pointer-events-none" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-elevated)] text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">To</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400 pointer-events-none" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setResult(null); setError(null) }}
                  disabled={periodType === 'day'}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-elevated)] text-stone-700 dark:text-stone-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
            </div>
          </div>

          {/* Due date (optional) */}
          <div>
            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Due date (optional)</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400 pointer-events-none" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => { setDueDate(e.target.value); setResult(null); setError(null) }}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-elevated)] text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/30 p-3">
              <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 p-3 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                  Created {result.created} share request{result.created !== 1 ? 's' : ''}
                </p>
                {result.skipped > 0 && (
                  <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                    {result.skipped} member{result.skipped !== 1 ? 's' : ''} skipped (already have an open or submitted share for this period)
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-100 dark:border-[var(--dark-border)]">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
          >
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button
              onClick={handleCreate}
              disabled={creating || !dateFrom || !dateTo}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              {creating ? 'Creating...' : 'Create for All Members'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
