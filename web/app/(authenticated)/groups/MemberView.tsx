'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart3, Send, Clock, Users, Eye, EyeOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { GroupWithMeta } from '@/lib/repositories/groups'
import type { GroupShare } from '@/lib/repositories/groupShares'
import MemberStatsCard, { type OwnStats } from './MemberStatsCard'
import CurrentSharePanel from './CurrentSharePanel'

interface ProjectItem { id: string; name: string; color: string }
interface TagItem { id: string; name: string; color: string }

interface Props {
  group: GroupWithMeta
  projects: ProjectItem[]
  tags: TagItem[]
  userId: string
  ownStats: OwnStats
}

type Tab = 'overview' | 'share' | 'history' | 'members'

interface MemberInfo {
  user_id: string
  role: string
  email: string
  display_name: string | null
}

function formatPeriod(share: GroupShare): string {
  const from = new Date(share.date_from + 'T00:00:00')
  const to = new Date(share.date_to + 'T00:00:00')
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (share.period_type === 'day') return from.toLocaleDateString(undefined, opts)
  return `${from.toLocaleDateString(undefined, opts)} – ${to.toLocaleDateString(undefined, opts)}`
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'approved':
      return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300">Approved</span>
    case 'denied':
      return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300">Denied</span>
    case 'submitted':
      return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300">Submitted</span>
    default:
      return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">Open</span>
  }
}

export default function MemberView({ group, projects, tags, userId, ownStats }: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const [members, setMembers] = useState<MemberInfo[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [sharingEnabled, setSharingEnabled] = useState<boolean | null>(null)
  const [history, setHistory] = useState<GroupShare[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Fetch sharing status on mount
  useEffect(() => {
    fetch(`/api/groups/${group.id}/sharing`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setSharingEnabled(data.sharing_enabled) })
  }, [group.id])

  const loadMembers = useCallback(async () => {
    setMembersLoading(true)
    try {
      const res = await fetch(`/api/groups/${group.id}`)
      if (res.ok) {
        const data = await res.json()
        setMembers(data.members ?? [])
      }
    } finally {
      setMembersLoading(false)
    }
  }, [group.id])

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/groups/${group.id}/shares?mine=true`)
      if (res.ok) {
        const data: GroupShare[] = await res.json()
        // Show approved and denied shares only
        setHistory(data.filter(s => s.status === 'approved' || s.status === 'denied'))
      }
    } finally {
      setHistoryLoading(false)
    }
  }, [group.id])

  useEffect(() => {
    if (tab === 'members' && members.length === 0) loadMembers()
    if (tab === 'history' && history.length === 0) loadHistory()
  }, [tab, members.length, history.length, loadMembers, loadHistory])

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { key: 'share', label: 'Current Share', icon: <Send className="h-3.5 w-3.5" /> },
    { key: 'history', label: 'History', icon: <Clock className="h-3.5 w-3.5" /> },
    { key: 'members', label: 'Members', icon: <Users className="h-3.5 w-3.5" /> },
  ]

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex border-b border-stone-200 dark:border-[var(--dark-border)] overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              tab === t.key
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <MemberStatsCard ownStats={ownStats} />

          {/* Sharing status */}
          <div className="rounded-xl bg-stone-50 dark:bg-[var(--dark-elevated)] px-4 py-3 flex items-center gap-3">
            {sharingEnabled ? (
              <Eye className="h-4 w-4 text-emerald-500" />
            ) : (
              <EyeOff className="h-4 w-4 text-stone-400" />
            )}
            <div>
              <p className="text-sm font-medium text-stone-700 dark:text-stone-200">
                {sharingEnabled === null ? 'Loading...' : sharingEnabled ? 'Sharing is on' : 'Sharing is off'}
              </p>
              <p className="text-xs text-stone-400">
                {sharingEnabled
                  ? 'Group admins can request your time data for reviews'
                  : 'Enable sharing in your group settings to participate in share requests'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === 'share' && (
        <CurrentSharePanel
          groupId={group.id}
          projects={projects}
          tags={tags}
          hasSchedule={!!group.share_frequency}
        />
      )}

      {tab === 'history' && (
        <div className="space-y-2">
          {historyLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-stone-200 dark:border-[var(--dark-border)] p-10 text-center">
              <Clock className="h-8 w-8 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
              <p className="text-sm text-stone-500 dark:text-stone-400">No share history yet</p>
            </div>
          ) : (
            history.map(share => (
              <div
                key={share.id}
                className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-stone-800 dark:text-stone-100">
                      {formatPeriod(share)}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-stone-400">
                      <span>{share.total_hours.toFixed(1)}h</span>
                      <span className="text-stone-300 dark:text-stone-600">|</span>
                      <span>{share.entry_count} entries</span>
                      {share.reviewed_at && (
                        <>
                          <span className="text-stone-300 dark:text-stone-600">|</span>
                          <span>Reviewed {new Date(share.reviewed_at).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                    {share.admin_comment && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5">
                        Admin: {share.admin_comment}
                      </p>
                    )}
                  </div>
                  {getStatusBadge(share.status)}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'members' && (
        <div className="space-y-1">
          {membersLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 rounded-xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-8">No members found</p>
          ) : (
            members.map(m => (
              <div
                key={m.user_id}
                className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                    {(m.display_name || m.email)?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-stone-700 dark:text-stone-200 truncate">
                      {m.display_name || m.email}
                    </p>
                    {m.display_name && (
                      <p className="text-xs text-stone-400 truncate">{m.email}</p>
                    )}
                  </div>
                </div>
                <Badge variant={m.role === 'admin' ? 'default' : 'secondary'} className="text-xs flex-shrink-0">
                  {m.role}
                </Badge>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
