'use client'

import { useState, useEffect } from 'react'
import { BarChart3, ChevronDown, ChevronRight, Clock, Eye, EyeOff, User } from 'lucide-react'

interface MemberSummary {
  user_id: string
  display_name: string
  email: string
  role: string
  sharing_enabled: boolean
  current_week_hours: number
  last_week_hours: number
  current_month_hours: number
  last_month_hours: number
}

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

interface Props {
  groupId: string
}

function formatHours(h: number) {
  return h < 0.1 ? '0h' : h < 10 ? `${h.toFixed(1)}h` : `${Math.round(h)}h`
}

function formatDuration(ms: number) {
  const totalMin = Math.round(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}m`
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatTime(ts: number) {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function GroupAdminView({ groupId }: Props) {
  const [members, setMembers] = useState<MemberSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [entries, setEntries] = useState<MemberEntry[]>([])
  const [entriesLoading, setEntriesLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/groups/${groupId}/shared-entries`)
      .then(r => r.json())
      .then(data => {
        setMembers(data.members ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [groupId])

  async function handleExpandMember(userId: string) {
    if (expandedMember === userId) {
      setExpandedMember(null)
      setEntries([])
      return
    }
    setExpandedMember(userId)
    setEntriesLoading(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/shared-entries?memberId=${userId}`)
      const data = await res.json()
      setEntries(data.entries ?? [])
    } catch {
      setEntries([])
    }
    setEntriesLoading(false)
  }

  const sharingCount = members.filter(m => m.sharing_enabled).length
  const totalSharedHours = members.reduce((s, m) => s + m.current_month_hours, 0)

  if (loading) {
    return (
      <div className="py-8 flex justify-center">
        <div className="h-5 w-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-stone-50 dark:bg-[var(--dark-elevated)] px-4 py-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Eye className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-xs text-stone-400 dark:text-stone-500">Active Sharers</span>
          </div>
          <p className="text-lg font-bold text-stone-800 dark:text-stone-100">{sharingCount} / {members.length}</p>
        </div>
        <div className="rounded-xl bg-stone-50 dark:bg-[var(--dark-elevated)] px-4 py-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Clock className="h-3.5 w-3.5 text-indigo-500" />
            <span className="text-xs text-stone-400 dark:text-stone-500">This Month (shared)</span>
          </div>
          <p className="text-lg font-bold text-stone-800 dark:text-stone-100">{formatHours(totalSharedHours)}</p>
        </div>
      </div>

      {/* Member list with hours table */}
      <div className="rounded-xl border border-stone-100 dark:border-[var(--dark-border)] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_repeat(4,_64px)] gap-1 px-4 py-2 bg-stone-50 dark:bg-[var(--dark-elevated)] text-xs text-stone-400 dark:text-stone-500 font-medium">
          <span>Member</span>
          <span className="text-right">This Wk</span>
          <span className="text-right">Last Wk</span>
          <span className="text-right">This Mo</span>
          <span className="text-right">Last Mo</span>
        </div>

        {/* Rows */}
        {members.map(member => (
          <div key={member.user_id}>
            <button
              onClick={() => member.sharing_enabled ? handleExpandMember(member.user_id) : undefined}
              className={`w-full grid grid-cols-[1fr_repeat(4,_64px)] gap-1 px-4 py-3 text-left transition-colors border-t border-stone-50 dark:border-[var(--dark-border)] ${
                member.sharing_enabled
                  ? 'hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)] cursor-pointer'
                  : 'opacity-50 cursor-default'
              } ${expandedMember === member.user_id ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {member.sharing_enabled ? (
                  expandedMember === member.user_id
                    ? <ChevronDown className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
                    : <ChevronRight className="h-3.5 w-3.5 text-stone-300 flex-shrink-0" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 text-stone-300 flex-shrink-0" />
                )}
                <div className="h-6 w-6 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                  {(member.display_name || member.email)?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-stone-700 dark:text-stone-200 truncate">
                    {member.display_name || member.email}
                  </p>
                </div>
              </div>
              <span className="text-sm text-right text-stone-600 dark:text-stone-300 tabular-nums">
                {member.sharing_enabled ? formatHours(member.current_week_hours) : '—'}
              </span>
              <span className="text-sm text-right text-stone-600 dark:text-stone-300 tabular-nums">
                {member.sharing_enabled ? formatHours(member.last_week_hours) : '—'}
              </span>
              <span className="text-sm text-right text-stone-600 dark:text-stone-300 tabular-nums">
                {member.sharing_enabled ? formatHours(member.current_month_hours) : '—'}
              </span>
              <span className="text-sm text-right text-stone-600 dark:text-stone-300 tabular-nums">
                {member.sharing_enabled ? formatHours(member.last_month_hours) : '—'}
              </span>
            </button>

            {/* Expanded entries */}
            {expandedMember === member.user_id && (
              <div className="border-t border-stone-100 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] px-4 py-3">
                {entriesLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="h-4 w-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                  </div>
                ) : entries.length === 0 ? (
                  <p className="text-sm text-stone-400 text-center py-4">No entries found</p>
                ) : (
                  <div className="space-y-1.5 max-h-80 overflow-y-auto">
                    {entries.map(entry => (
                      <div key={entry.id} className="flex items-center gap-3 py-1.5 text-sm">
                        <span className="text-xs text-stone-400 dark:text-stone-500 w-20 flex-shrink-0 tabular-nums">
                          {entry.date}
                        </span>
                        <span
                          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: entry.project_color }}
                        />
                        <span className="text-stone-600 dark:text-stone-300 truncate flex-1 min-w-0">
                          {entry.project_name}
                          {entry.description && (
                            <span className="text-stone-400 dark:text-stone-500 ml-1.5">— {entry.description}</span>
                          )}
                        </span>
                        <span className="text-xs text-stone-400 dark:text-stone-500 flex-shrink-0 tabular-nums">
                          {formatTime(entry.start_time)}–{formatTime(entry.end_time)}
                        </span>
                        <span className="text-xs font-medium text-stone-600 dark:text-stone-300 flex-shrink-0 w-12 text-right tabular-nums">
                          {formatDuration(entry.duration)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {members.length === 0 && (
          <div className="px-4 py-8 text-center">
            <User className="h-8 w-8 text-stone-300 mx-auto mb-2" />
            <p className="text-sm text-stone-400">No members in this group</p>
          </div>
        )}
      </div>
    </div>
  )
}
