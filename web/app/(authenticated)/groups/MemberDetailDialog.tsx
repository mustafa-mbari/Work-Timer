'use client'

import { useState, useEffect } from 'react'
import { Clock, Folder } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface MemberEntry {
  id: string
  date: string
  start_time: number
  end_time: number
  duration: number
  description: string | null
  project_id: string | null
  project_name: string
  project_color: string
}

interface ProjectBreakdown {
  name: string
  color: string
  hours: number
  pct: number
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: string
  member: { user_id: string; display_name: string; email: string }
  periodLabel: string
  dateRange: { from: string; to: string }
}

import { formatHours, formatDuration } from './utils'
import { MemberAvatar } from './MemberAvatar'

function formatTime(ts: number) {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function MemberDetailDialog({ open, onOpenChange, groupId, member, periodLabel, dateRange }: Props) {
  const [entries, setEntries] = useState<MemberEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(`/api/groups/${groupId}/shared-entries?memberId=${member.user_id}&dateFrom=${dateRange.from}&dateTo=${dateRange.to}`)
      .then(r => r.json())
      .then(data => {
        setEntries(data.entries ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [open, groupId, member.user_id, dateRange.from, dateRange.to])

  // Aggregate project breakdown
  const projectMap = new Map<string, { name: string; color: string; ms: number }>()
  for (const e of entries) {
    const key = e.project_id ?? '_none'
    const existing = projectMap.get(key)
    if (existing) {
      existing.ms += e.duration
    } else {
      projectMap.set(key, {
        name: e.project_name || 'No project',
        color: e.project_color || '#94a3b8',
        ms: e.duration,
      })
    }
  }
  const totalMs = entries.reduce((s, e) => s + e.duration, 0)
  const totalHours = totalMs / 3_600_000
  const projects: ProjectBreakdown[] = [...projectMap.values()]
    .map(p => ({
      name: p.name,
      color: p.color,
      hours: p.ms / 3_600_000,
      pct: totalMs > 0 ? Math.round((p.ms / totalMs) * 100) : 0,
    }))
    .sort((a, b) => b.hours - a.hours)

  const displayName = member.display_name || member.email

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MemberAvatar name={member.display_name} email={member.email} size="lg" />
            <div>
              <p className="text-base">{displayName}</p>
              <p className="text-xs font-normal text-stone-400">{periodLabel}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="h-6 w-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="py-12 text-center">
            <Clock className="h-8 w-8 text-stone-300 mx-auto mb-2" />
            <p className="text-sm text-stone-400">No entries for this period</p>
          </div>
        ) : (
          <div className="space-y-6 mt-2">
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-stone-50 dark:bg-[var(--dark-elevated)] px-4 py-3">
                <p className="text-xs text-stone-400 mb-0.5">Total Hours</p>
                <p className="text-lg font-bold text-stone-800 dark:text-stone-100 tabular-nums">
                  {formatHours(Math.round(totalHours * 10) / 10)}
                </p>
              </div>
              <div className="rounded-xl bg-stone-50 dark:bg-[var(--dark-elevated)] px-4 py-3">
                <p className="text-xs text-stone-400 mb-0.5">Entries</p>
                <p className="text-lg font-bold text-stone-800 dark:text-stone-100 tabular-nums">
                  {entries.length}
                </p>
              </div>
            </div>

            {/* Project breakdown bar */}
            {projects.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-2 flex items-center gap-1.5">
                  <Folder className="h-3.5 w-3.5" />
                  Project Breakdown
                </h3>

                {/* Stacked color bar */}
                <div className="h-3 rounded-full overflow-hidden flex mb-3">
                  {projects.map((p, i) => (
                    <div
                      key={i}
                      className="h-full"
                      style={{ width: `${p.pct}%`, backgroundColor: p.color }}
                      title={`${p.name}: ${formatHours(Math.round(p.hours * 10) / 10)} (${p.pct}%)`}
                    />
                  ))}
                </div>

                {/* Project list */}
                <div className="space-y-1.5">
                  {projects.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="text-stone-700 dark:text-stone-200 truncate flex-1">{p.name}</span>
                      <span className="text-stone-500 dark:text-stone-400 tabular-nums flex-shrink-0">
                        {formatHours(Math.round(p.hours * 10) / 10)}
                      </span>
                      <span className="text-xs text-stone-400 w-10 text-right flex-shrink-0">{p.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Entry table */}
            <div>
              <h3 className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-2 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Entries
              </h3>
              <div className="rounded-xl border border-stone-100 dark:border-[var(--dark-border)] overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-stone-50 dark:bg-stone-800/50">
                      <th className="text-left px-3 py-2 font-medium text-stone-400">Date</th>
                      <th className="text-left px-2 py-2 font-medium text-stone-400">Description</th>
                      <th className="text-left px-2 py-2 font-medium text-stone-400">Project</th>
                      <th className="text-right px-2 py-2 font-medium text-stone-400">Time</th>
                      <th className="text-right px-3 py-2 font-medium text-stone-400">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(e => (
                      <tr key={e.id} className="border-t border-stone-50 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/30">
                        <td className="px-3 py-2 text-stone-500 whitespace-nowrap">{e.date}</td>
                        <td className="px-2 py-2 text-stone-700 dark:text-stone-200 max-w-[10rem] truncate">
                          {e.description || <span className="text-stone-300">--</span>}
                        </td>
                        <td className="px-2 py-2">
                          {e.project_name ? (
                            <span className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: e.project_color ?? '#94a3b8' }} />
                              <span className="text-stone-600 dark:text-stone-300 truncate max-w-[5rem]">{e.project_name}</span>
                            </span>
                          ) : <span className="text-stone-300">--</span>}
                        </td>
                        <td className="px-2 py-2 text-right text-stone-400 whitespace-nowrap tabular-nums">
                          {formatTime(e.start_time)}–{formatTime(e.end_time)}
                        </td>
                        <td className="px-3 py-2 text-right text-stone-600 dark:text-stone-300 whitespace-nowrap tabular-nums font-medium">
                          {formatDuration(e.duration)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50">
                      <td colSpan={4} className="px-3 py-2 font-semibold text-stone-500">Total</td>
                      <td className="px-3 py-2 text-right font-semibold text-stone-700 dark:text-stone-200 tabular-nums">
                        {formatHours(Math.round(totalHours * 10) / 10)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
