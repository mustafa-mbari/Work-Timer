'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, RotateCcw, Flame, Calendar, Clock, ChevronDown, ChevronUp, Tag, Folder } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { GroupShare } from '@/lib/repositories/groupShares'
import ShareWizard from './ShareWizard'

interface ProjectItem { id: string; name: string; color: string }
interface TagItem    { id: string; name: string; color: string }

interface Props {
  groupId: string
  projects: ProjectItem[]
  tags: TagItem[]
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
  if (days < 7)  return `${days} days ago`
  if (days < 31) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`
}

function periodLabel(s: GroupShare): string {
  if (s.period_type === 'month') {
    const d = new Date(s.date_from + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }
  if (s.period_type === 'week') {
    const from = new Date(s.date_from + 'T00:00:00')
    const to   = new Date(s.date_to   + 'T00:00:00')
    return `${from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }
  const d = new Date(s.date_from + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function computeStreak(shares: GroupShare[]): number {
  if (!shares.length) return 0
  // Sort descending by date
  const sorted = [...shares].sort((a, b) => b.date_from.localeCompare(a.date_from))
  const now = new Date()
  // Only count monthly streaks (most meaningful)
  const monthShares = sorted.filter(s => s.period_type === 'month')
  if (!monthShares.length) return 0

  let streak = 0
  let expectedYear = now.getFullYear()
  let expectedMonth = now.getMonth() // 0-indexed

  for (const s of monthShares) {
    const d = new Date(s.date_from + 'T00:00:00')
    if (d.getFullYear() === expectedYear && d.getMonth() === expectedMonth) {
      streak++
      expectedMonth--
      if (expectedMonth < 0) { expectedMonth = 11; expectedYear-- }
    } else {
      break
    }
  }
  return streak
}

function hasSharedCurrentPeriod(shares: GroupShare[], periodType: 'month' | 'week' | 'day'): boolean {
  const now = new Date()
  return shares.some(s => {
    if (s.period_type !== periodType) return false
    const from = new Date(s.date_from + 'T00:00:00')
    if (periodType === 'month') {
      return from.getFullYear() === now.getFullYear() && from.getMonth() === now.getMonth()
    }
    if (periodType === 'week') {
      const mon = new Date(now)
      mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
      mon.setHours(0, 0, 0, 0)
      return from >= mon
    }
    // day
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    return s.date_from === today
  })
}

function currentMonthLabel() {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShareHistoryTab({ groupId, projects, tags }: Props) {
  const [shares, setShares] = useState<GroupShare[]>([])
  const [loading, setLoading] = useState(true)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [prefill, setPrefill] = useState<GroupShare | undefined>()
  const [expandedShare, setExpandedShare] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/groups/${groupId}/shares`)
    if (res.ok) setShares(await res.json())
    setLoading(false)
  }, [groupId])

  useEffect(() => { load() }, [load])

  async function handleDelete(shareId: string) {
    setDeleting(shareId)
    const res = await fetch(`/api/groups/${groupId}/shares/${shareId}`, { method: 'DELETE' })
    setDeleting(null)
    if (res.ok) {
      setShares(prev => prev.filter(s => s.id !== shareId))
      if (expandedShare === shareId) setExpandedShare(null)
      toast.success('Share deleted')
    } else {
      toast.error('Failed to delete share')
    }
  }

  function openWizard(share?: GroupShare) {
    setPrefill(share)
    setWizardOpen(true)
  }

  const streak = computeStreak(shares)
  const hasSharedThisMonth = hasSharedCurrentPeriod(shares, 'month')

  return (
    <div className="space-y-4">
      {/* ── Reminder card ── */}
      {!loading && !hasSharedThisMonth && (
        <div className="rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 border border-indigo-100 dark:border-indigo-800 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">
                {currentMonthLabel()} · Not shared yet
              </p>
              <p className="text-xs text-indigo-500 dark:text-indigo-400">
                Your team hasn't seen your work this month.
              </p>
            </div>
          </div>
          <Button
            onClick={() => openWizard()}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex-shrink-0 gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Share
          </Button>
        </div>
      )}

      {/* ── Header row ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {streak > 1 && (
            <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-full px-2.5 py-1 text-xs font-semibold">
              <Flame className="h-3.5 w-3.5" />
              {streak} months in a row
            </div>
          )}
          {!loading && shares.length > 0 && (
            <span className="text-xs text-stone-400">{shares.length} share{shares.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        <Button
          onClick={() => openWizard()}
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          New Share
        </Button>
      </div>

      {/* ── Share list ── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-24 rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
          ))}
        </div>
      ) : shares.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 dark:border-stone-700 p-10 flex flex-col items-center gap-3 text-center">
          <div className="h-12 w-12 rounded-2xl bg-stone-50 dark:bg-stone-800 flex items-center justify-center">
            <Clock className="h-6 w-6 text-stone-300 dark:text-stone-600" />
          </div>
          <p className="font-semibold text-stone-600 dark:text-stone-300">No shares yet</p>
          <p className="text-sm text-stone-400 max-w-xs">
            Share a snapshot of your time entries with group admins. Choose a period and filter by project or tag.
          </p>
          <Button
            onClick={() => openWizard()}
            className="mt-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Share your first report
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {shares.map(share => {
            const isExpanded = expandedShare === share.id
            const projectNames = share.project_ids === null
              ? 'All projects'
              : share.project_ids.length === 0
                ? 'No projects'
                : projects.filter(p => share.project_ids!.includes(p.id)).map(p => p.name).join(', ') || 'Custom selection'
            const tagNames = share.tag_ids === null
              ? 'All tags'
              : share.tag_ids.length === 0
                ? 'No tags'
                : tags.filter(t => share.tag_ids!.includes(t.id)).map(t => t.name).join(', ') || 'Custom selection'

            return (
              <div
                key={share.id}
                className="rounded-2xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm overflow-hidden"
              >
                <div className="p-4">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm">
                        {periodLabel(share)}
                      </p>
                      <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                        {relativeDate(share.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Badge variant="secondary" className="text-xs font-semibold">
                        {formatHours(share.total_hours)}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {share.entry_count} {share.entry_count === 1 ? 'entry' : 'entries'}
                      </Badge>
                    </div>
                  </div>

                  {/* Filters summary */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span className="inline-flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-800 rounded-full px-2 py-0.5">
                      <Folder className="h-3 w-3" /> {projectNames}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-800 rounded-full px-2 py-0.5">
                      <Tag className="h-3 w-3" /> {tagNames}
                    </span>
                  </div>

                  {/* Note */}
                  {share.note && (
                    <p className="text-xs italic text-stone-400 dark:text-stone-500 mb-2">
                      "{share.note}"
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setExpandedShare(isExpanded ? null : share.id)}
                      className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {isExpanded ? 'Hide' : 'View'} entries
                    </button>
                    <span className="text-stone-200 dark:text-stone-700">·</span>
                    <button
                      onClick={() => openWizard(share)}
                      className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Re-share
                    </button>
                    <span className="flex-1" />
                    <button
                      onClick={() => handleDelete(share.id)}
                      disabled={deleting === share.id}
                      className="p-1 text-stone-300 hover:text-rose-500 dark:hover:text-rose-400 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded entries */}
                {isExpanded && (
                  <div className="border-t border-stone-100 dark:border-[var(--dark-border)] max-h-64 overflow-y-auto">
                    {share.entries.length === 0 ? (
                      <p className="text-xs text-stone-400 p-4 text-center">No entries in this snapshot.</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-stone-50 dark:bg-stone-800/50">
                            <th className="text-left px-4 py-2 font-medium text-stone-400 dark:text-stone-500">Date</th>
                            <th className="text-left px-2 py-2 font-medium text-stone-400 dark:text-stone-500">Description</th>
                            <th className="text-left px-2 py-2 font-medium text-stone-400 dark:text-stone-500">Project</th>
                            <th className="text-right px-4 py-2 font-medium text-stone-400 dark:text-stone-500">Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          {share.entries.map(e => (
                            <tr key={e.id} className="border-t border-stone-50 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/30">
                              <td className="px-4 py-2 text-stone-500 dark:text-stone-400 whitespace-nowrap">{e.date}</td>
                              <td className="px-2 py-2 text-stone-700 dark:text-stone-200 max-w-[10rem] truncate">
                                {e.description || <span className="text-stone-300">—</span>}
                              </td>
                              <td className="px-2 py-2">
                                {e.project_name ? (
                                  <span className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: e.project_color ?? '#94a3b8' }} />
                                    <span className="text-stone-600 dark:text-stone-300 truncate max-w-[5rem]">{e.project_name}</span>
                                  </span>
                                ) : (
                                  <span className="text-stone-300">—</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-right text-stone-600 dark:text-stone-300 whitespace-nowrap">
                                {formatDuration(e.duration)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <ShareWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        groupId={groupId}
        projects={projects}
        tags={tags}
        prefill={prefill}
        onCreated={share => setShares(prev => [share, ...prev])}
      />
    </div>
  )
}
