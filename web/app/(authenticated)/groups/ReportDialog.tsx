'use client'

import { useState, useMemo } from 'react'
import { X, Download, FileBarChart, Calendar } from 'lucide-react'

interface MemberInfo {
  user_id: string
  display_name: string | null
  email: string
}

interface MemberEntry {
  id: string
  date: string
  duration: number
  description: string | null
  project_id: string | null
  project_name: string | null
  project_color: string | null
}

interface MemberReport {
  member: MemberInfo
  entries: MemberEntry[]
  totalHours: number
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: string
  members: MemberInfo[]
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getQuickRange(type: string): { from: string; to: string } {
  const now = new Date()
  if (type === 'this-week') {
    const mon = new Date(now)
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    return { from: formatDate(mon), to: formatDate(sun) }
  }
  if (type === 'last-week') {
    const mon = new Date(now)
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7) - 7)
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    return { from: formatDate(mon), to: formatDate(sun) }
  }
  if (type === 'this-month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1)
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { from: formatDate(first), to: formatDate(last) }
  }
  if (type === 'last-month') {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const last = new Date(now.getFullYear(), now.getMonth(), 0)
    return { from: formatDate(first), to: formatDate(last) }
  }
  return { from: formatDate(now), to: formatDate(now) }
}

export default function ReportDialog({ open, onOpenChange, groupId, members }: Props) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [reports, setReports] = useState<MemberReport[]>([])
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)

  const grandTotal = useMemo(() => {
    return reports.reduce((sum, r) => sum + r.totalHours, 0)
  }, [reports])

  const grandEntries = useMemo(() => {
    return reports.reduce((sum, r) => sum + r.entries.length, 0)
  }, [reports])

  function applyQuickRange(type: string) {
    const range = getQuickRange(type)
    setDateFrom(range.from)
    setDateTo(range.to)
  }

  async function handleGenerate() {
    if (!dateFrom || !dateTo) return
    setLoading(true)
    setGenerated(false)

    try {
      const results = await Promise.allSettled(
        members.map(async (m) => {
          const res = await fetch(
            `/api/groups/${groupId}/shared-entries?memberId=${m.user_id}&dateFrom=${dateFrom}&dateTo=${dateTo}`
          )
          if (!res.ok) return { member: m, entries: [] as MemberEntry[], totalHours: 0 }
          const data = await res.json()
          const entries: MemberEntry[] = data.entries ?? []
          const totalMs = entries.reduce((s, e) => s + (e.duration ?? 0), 0)
          return {
            member: m,
            entries,
            totalHours: Math.round((totalMs / 3_600_000) * 100) / 100,
          }
        })
      )

      setReports(
        results
          .filter((r): r is PromiseFulfilledResult<MemberReport> => r.status === 'fulfilled')
          .map(r => r.value)
          .filter(r => r.entries.length > 0)
          .sort((a, b) => b.totalHours - a.totalHours)
      )
      setGenerated(true)
    } finally {
      setLoading(false)
    }
  }

  function exportCsv() {
    const rows: string[] = ['Member,Date,Description,Project,Duration (h)']
    for (const r of reports) {
      const name = (r.member.display_name || r.member.email.split('@')[0]).replace(/,/g, ' ')
      for (const e of r.entries) {
        const desc = (e.description ?? '').replace(/,/g, ' ').replace(/\n/g, ' ')
        const proj = (e.project_name ?? '').replace(/,/g, ' ')
        const hours = (e.duration / 3_600_000).toFixed(2)
        rows.push(`${name},${e.date},${desc},${proj},${hours}`)
      }
    }
    rows.push('')
    rows.push(`Total,,,,${grandTotal.toFixed(2)}`)

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `team-report-${dateFrom}-to-${dateTo}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-white dark:bg-[var(--dark-card)] rounded-2xl shadow-xl overflow-hidden flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-[var(--dark-border)]">
          <div className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">Generate Report</h2>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-[var(--dark-hover)] transition-colors">
            <X className="h-4 w-4 text-stone-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Date range */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {['this-week', 'last-week', 'this-month', 'last-month'].map(type => (
                <button
                  key={type}
                  onClick={() => applyQuickRange(type)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-elevated)] text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)] transition-colors"
                >
                  {type.replace('-', ' ').replace(/^\w/, c => c.toUpperCase()).replace(/\s\w/, c => c.toUpperCase())}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">From</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400 pointer-events-none" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
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
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-elevated)] text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>
              <div className="pt-5">
                <button
                  onClick={handleGenerate}
                  disabled={loading || !dateFrom || !dateTo}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors whitespace-nowrap"
                >
                  {loading ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          {generated && (
            <>
              {/* Summary */}
              <div className="flex gap-4">
                <div className="flex-1 rounded-xl bg-stone-50 dark:bg-[var(--dark-elevated)] p-3 text-center">
                  <p className="text-lg font-bold text-stone-800 dark:text-stone-100">{grandTotal.toFixed(1)}h</p>
                  <p className="text-xs text-stone-400">Total Team Hours</p>
                </div>
                <div className="flex-1 rounded-xl bg-stone-50 dark:bg-[var(--dark-elevated)] p-3 text-center">
                  <p className="text-lg font-bold text-stone-800 dark:text-stone-100">{grandEntries}</p>
                  <p className="text-xs text-stone-400">Total Entries</p>
                </div>
                <div className="flex-1 rounded-xl bg-stone-50 dark:bg-[var(--dark-elevated)] p-3 text-center">
                  <p className="text-lg font-bold text-stone-800 dark:text-stone-100">{reports.length}</p>
                  <p className="text-xs text-stone-400">Members</p>
                </div>
              </div>

              {/* Per-member breakdown */}
              {reports.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-stone-500 dark:text-stone-400">No entries found for this period.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map(r => (
                    <div key={r.member.user_id} className="rounded-xl border border-stone-100 dark:border-[var(--dark-border)] p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                            {(r.member.display_name || r.member.email).slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-stone-800 dark:text-stone-100">
                            {r.member.display_name || r.member.email.split('@')[0]}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-stone-700 dark:text-stone-200 tabular-nums">
                          {r.totalHours.toFixed(1)}h
                        </span>
                      </div>
                      <p className="text-xs text-stone-400">{r.entries.length} entries</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {generated && reports.length > 0 && (
          <div className="flex items-center justify-end px-6 py-4 border-t border-stone-100 dark:border-[var(--dark-border)]">
            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
