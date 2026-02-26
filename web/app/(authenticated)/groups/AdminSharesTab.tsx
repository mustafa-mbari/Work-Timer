'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, ChevronDown, ChevronUp, Folder, Tag, Clock } from 'lucide-react'
import type { GroupShareWithMeta } from '@/lib/repositories/groupShares'

interface Props {
  groupId: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatHours(h: number) {
  return h % 1 === 0 ? `${h}h` : `${h.toFixed(1)}h`
}

function formatDuration(ms: number) {
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7)  return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function periodLabel(s: GroupShareWithMeta): string {
  if (s.period_type === 'month') {
    const d = new Date(s.date_from + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }
  if (s.period_type === 'week') {
    const from = new Date(s.date_from + 'T00:00:00')
    const to   = new Date(s.date_to   + 'T00:00:00')
    return `${from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${to.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }
  const d = new Date(s.date_from + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getInitials(name: string | null, email: string): string {
  const src = name || email
  return src.charAt(0).toUpperCase()
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminSharesTab({ groupId }: Props) {
  const [shares, setShares] = useState<GroupShareWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedShare, setExpandedShare] = useState<string | null>(null)
  const [filterMember, setFilterMember] = useState<string>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/groups/${groupId}/shares`)
    if (res.ok) setShares(await res.json())
    setLoading(false)
  }, [groupId])

  useEffect(() => { load() }, [load])

  // Unique members who have shared
  const members = Array.from(
    new Map(shares.map(s => [s.user_id, { id: s.user_id, email: s.sharer_email, name: s.sharer_name }])).values()
  ).sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email))

  const filtered = filterMember === 'all' ? shares : shares.filter(s => s.user_id === filterMember)

  // Group by member
  const byMember = new Map<string, GroupShareWithMeta[]>()
  for (const s of filtered) {
    const key = s.user_id
    if (!byMember.has(key)) byMember.set(key, [])
    byMember.get(key)!.push(s)
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-2">
        <select
          value={filterMember}
          onChange={e => setFilterMember(e.target.value)}
          className="text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-1.5 text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        >
          <option value="all">All members</option>
          {members.map(m => (
            <option key={m.id} value={m.id}>{m.name || m.email}</option>
          ))}
        </select>
        {!loading && (
          <span className="text-xs text-stone-400">{filtered.length} share{filtered.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 dark:border-stone-700 p-10 flex flex-col items-center gap-3 text-center">
          <div className="h-12 w-12 rounded-2xl bg-stone-50 dark:bg-stone-800 flex items-center justify-center">
            <Users className="h-6 w-6 text-stone-300 dark:text-stone-600" />
          </div>
          <p className="font-semibold text-stone-600 dark:text-stone-300">No shared data yet</p>
          <p className="text-sm text-stone-400 max-w-xs">
            Members can share snapshots of their time entries from the "My Shares" tab.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(byMember.entries()).map(([userId, memberShares]) => {
            const meta = memberShares[0]
            const displayName = meta.sharer_name || meta.sharer_email
            const initials = getInitials(meta.sharer_name, meta.sharer_email)
            const totalHours = memberShares.reduce((s, x) => s + x.total_hours, 0)

            return (
              <div key={userId}>
                {/* Member header */}
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-sm font-semibold text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate">{displayName}</p>
                    {meta.sharer_name && (
                      <p className="text-xs text-stone-400 truncate">{meta.sharer_email}</p>
                    )}
                  </div>
                  <span className="text-xs text-stone-400 flex-shrink-0">
                    {formatHours(Math.round(totalHours * 10) / 10)} total · {memberShares.length} share{memberShares.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Member shares */}
                <div className="space-y-2 pl-10">
                  {memberShares.map(share => {
                    const isExpanded = expandedShare === share.id
                    const projectSummary = share.project_ids === null
                      ? 'All projects'
                      : `${share.project_ids.length} project${share.project_ids.length !== 1 ? 's' : ''}`
                    const tagSummary = share.tag_ids === null
                      ? 'All tags'
                      : `${share.tag_ids.length} tag${share.tag_ids.length !== 1 ? 's' : ''}`

                    return (
                      <div
                        key={share.id}
                        className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm overflow-hidden"
                      >
                        <button
                          onClick={() => setExpandedShare(isExpanded ? null : share.id)}
                          className="w-full text-left px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div>
                                <p className="text-sm font-medium text-stone-800 dark:text-stone-100">
                                  {periodLabel(share)}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className="text-xs text-stone-400 flex items-center gap-1">
                                    <Folder className="h-3 w-3" /> {projectSummary}
                                  </span>
                                  <span className="text-xs text-stone-400 flex items-center gap-1">
                                    <Tag className="h-3 w-3" /> {tagSummary}
                                  </span>
                                  {share.note && (
                                    <span className="text-xs text-stone-400 italic truncate max-w-[10rem]">
                                      "{share.note}"
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="text-right">
                                <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">
                                  {formatHours(share.total_hours)}
                                </p>
                                <p className="text-xs text-stone-400">
                                  {share.entry_count} {share.entry_count === 1 ? 'entry' : 'entries'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-stone-400">{relativeDate(share.created_at)}</p>
                              </div>
                              {isExpanded
                                ? <ChevronUp className="h-4 w-4 text-stone-300" />
                                : <ChevronDown className="h-4 w-4 text-stone-300" />
                              }
                            </div>
                          </div>
                        </button>

                        {/* Expanded entry table */}
                        {isExpanded && (
                          <div className="border-t border-stone-100 dark:border-[var(--dark-border)] max-h-72 overflow-y-auto">
                            {share.entries.length === 0 ? (
                              <p className="text-xs text-stone-400 p-4 text-center">No entries in this snapshot.</p>
                            ) : (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-stone-50 dark:bg-stone-800/50">
                                    <th className="text-left px-4 py-2 font-medium text-stone-400">Date</th>
                                    <th className="text-left px-2 py-2 font-medium text-stone-400">Description</th>
                                    <th className="text-left px-2 py-2 font-medium text-stone-400">Project</th>
                                    <th className="text-left px-2 py-2 font-medium text-stone-400">Tags</th>
                                    <th className="text-right px-4 py-2 font-medium text-stone-400">Duration</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {share.entries.map(e => (
                                    <tr key={e.id} className="border-t border-stone-50 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/30">
                                      <td className="px-4 py-2 text-stone-500 dark:text-stone-400 whitespace-nowrap">{e.date}</td>
                                      <td className="px-2 py-2 text-stone-700 dark:text-stone-200 max-w-[9rem] truncate">
                                        {e.description || <span className="text-stone-300">—</span>}
                                      </td>
                                      <td className="px-2 py-2">
                                        {e.project_name ? (
                                          <span className="flex items-center gap-1">
                                            <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: e.project_color ?? '#94a3b8' }} />
                                            <span className="text-stone-600 dark:text-stone-300 truncate max-w-[5rem]">{e.project_name}</span>
                                          </span>
                                        ) : <span className="text-stone-300">—</span>}
                                      </td>
                                      <td className="px-2 py-2">
                                        {e.tag_names.length > 0 ? (
                                          <span className="text-stone-500 dark:text-stone-400 truncate max-w-[5rem]">
                                            {e.tag_names.join(', ')}
                                          </span>
                                        ) : <span className="text-stone-300">—</span>}
                                      </td>
                                      <td className="px-4 py-2 text-right text-stone-600 dark:text-stone-300 whitespace-nowrap">
                                        {formatDuration(e.duration)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="border-t-2 border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50">
                                    <td colSpan={4} className="px-4 py-2 text-xs font-semibold text-stone-500 dark:text-stone-400">
                                      Total
                                    </td>
                                    <td className="px-4 py-2 text-right text-xs font-semibold text-stone-700 dark:text-stone-200">
                                      <span className="flex items-center justify-end gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatHours(share.total_hours)}
                                      </span>
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
