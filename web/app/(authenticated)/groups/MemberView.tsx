'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart3, Clock, Users, Eye, EyeOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import type { GroupWithMeta } from '@/lib/repositories/groups'
import type { GroupShareListItem } from '@/lib/repositories/groupShares'
import MemberStatsCard from './MemberStatsCard'
import CurrentSharePanel from './CurrentSharePanel'
import { formatPeriod } from './utils'
import type { ProjectItem, TagItem, OwnStats, MemberInfo } from './utils'
import { StatusBadge } from './StatusBadge'
import { MemberAvatar } from './MemberAvatar'
import { EmptyState } from './EmptyState'

interface Props {
  group: GroupWithMeta
  projects: ProjectItem[]
  tags: TagItem[]
  userId: string
  ownStats: OwnStats
}

type Tab = 'overview' | 'history' | 'members'

export default function MemberView({ group, projects, tags, userId, ownStats }: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const [members, setMembers] = useState<MemberInfo[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersLoaded, setMembersLoaded] = useState(false)
  const [sharingEnabled, setSharingEnabled] = useState<boolean | null>(null)
  const [sharingError, setSharingError] = useState<string | null>(null)
  const [sharingToggling, setSharingToggling] = useState(false)
  const [history, setHistory] = useState<GroupShareListItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)

  // Share counts for the analytics grid (4th card)
  const [openShareCount, setOpenShareCount] = useState(0)
  const [submittedShareCount, setSubmittedShareCount] = useState(0)
  const [sharesLoading, setSharesLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/groups/${group.id}/shares?status=open&mine=true`),
      fetch(`/api/groups/${group.id}/shares?status=submitted&mine=true`),
    ]).then(async ([openRes, subRes]) => {
      const open: GroupShareListItem[] = openRes.ok ? await openRes.json() : []
      const submitted: GroupShareListItem[] = subRes.ok ? await subRes.json() : []
      setOpenShareCount(open.length)
      setSubmittedShareCount(submitted.length)
    }).catch(() => {}).finally(() => setSharesLoading(false))
  }, [group.id])

  // Fetch sharing status on mount
  useEffect(() => {
    fetch(`/api/groups/${group.id}/sharing`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        setSharingEnabled(data.sharing_enabled)
        setSharingError(null)
      })
      .catch(err => setSharingError(err.message))
  }, [group.id])

  async function toggleSharing() {
    if (sharingEnabled === null) return
    setSharingToggling(true)
    try {
      const res = await fetch(`/api/groups/${group.id}/sharing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sharing_enabled: !sharingEnabled }),
      })
      if (res.ok) setSharingEnabled(!sharingEnabled)
    } finally {
      setSharingToggling(false)
    }
  }

  const loadMembers = useCallback(async () => {
    setMembersLoading(true)
    try {
      const res = await fetch(`/api/groups/${group.id}`)
      if (res.ok) {
        const data = await res.json()
        setMembers(data.members ?? [])
        setMembersLoaded(true)
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
        const data: GroupShareListItem[] = await res.json()
        setHistory(data.filter(s => s.status === 'approved' || s.status === 'denied'))
        setHistoryLoaded(true)
      }
    } finally {
      setHistoryLoading(false)
    }
  }, [group.id])

  useEffect(() => {
    if (tab === 'members' && !membersLoaded) loadMembers()
    if (tab === 'history' && !historyLoaded) loadHistory()
  }, [tab, membersLoaded, historyLoaded, loadMembers, loadHistory])

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <BarChart3 className="h-3.5 w-3.5" /> },
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
          <MemberStatsCard
            ownStats={ownStats}
            openShareCount={openShareCount}
            submittedShareCount={submittedShareCount}
            sharesLoading={sharesLoading}
            hasSchedule={!!group.share_frequency}
          />

          {/* Sharing toggle */}
          <div className="rounded-xl bg-stone-50 dark:bg-[var(--dark-elevated)] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {sharingEnabled ? (
                <Eye className="h-4 w-4 text-emerald-500" />
              ) : (
                <EyeOff className="h-4 w-4 text-stone-400" />
              )}
              <div>
                <p className="text-sm font-medium text-stone-700 dark:text-stone-200">
                  {sharingError ? 'Failed to load' : sharingEnabled === null ? 'Loading...' : sharingEnabled ? 'Sharing is on' : 'Sharing is off'}
                </p>
                <p className="text-xs text-stone-400">
                  {sharingError
                    ? 'Could not load sharing status'
                    : sharingEnabled
                      ? 'Admins can request your time data for reviews'
                      : 'Enable to participate in share requests'
                  }
                </p>
              </div>
            </div>
            <Switch
              checked={!!sharingEnabled}
              onCheckedChange={toggleSharing}
              disabled={sharingEnabled === null || sharingToggling}
            />
          </div>

          {/* Current share requests */}
          <CurrentSharePanel
            groupId={group.id}
            projects={projects}
            tags={tags}
            hasSchedule={!!group.share_frequency}
          />
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-2">
          {historyLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] p-4 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-3.5 w-32 rounded bg-stone-200 dark:bg-stone-700" />
                      <div className="h-2.5 w-48 rounded bg-stone-100 dark:bg-stone-800" />
                    </div>
                    <div className="h-5 w-16 rounded-full bg-stone-200 dark:bg-stone-700" />
                  </div>
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <EmptyState
              variant="dashed"
              icon={<Clock className="h-8 w-8" />}
              title="No share history yet"
              description="Approved and denied shares will appear here."
            />
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
                  <StatusBadge status={share.status} />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'members' && (
        <div className="space-y-1">
          {membersLoading ? (
            <div className="space-y-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-2.5 py-2 px-2 animate-pulse">
                  <div className="h-8 w-8 rounded-full bg-stone-200 dark:bg-stone-700" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-28 rounded bg-stone-200 dark:bg-stone-700" />
                    <div className="h-2.5 w-40 rounded bg-stone-100 dark:bg-stone-800" />
                  </div>
                  <div className="h-5 w-14 rounded-full bg-stone-200 dark:bg-stone-700" />
                </div>
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
                  <MemberAvatar name={m.display_name} email={m.email} size="lg" />
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
