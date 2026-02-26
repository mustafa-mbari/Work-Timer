'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, Eye, Users, BarChart3, Settings, Share2 } from 'lucide-react'
import type { GroupWithMeta } from '@/lib/repositories/groups'
import MemberCard from './MemberCard'
import MemberDetailDialog from './MemberDetailDialog'
import AdminSharesTab from './AdminSharesTab'
import AdminMembersPanel from './AdminMembersPanel'

interface ProjectItem { id: string; name: string; color: string }
interface TagItem { id: string; name: string; color: string }

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
  today_hours?: number
}

interface Props {
  group: GroupWithMeta
  projects: ProjectItem[]
  tags: TagItem[]
  onDeleteGroup: (id: string) => void
}

type Period = 'today' | 'week' | 'month'
type SubTab = 'overview' | 'snapshots' | 'manage'

function formatHours(h: number) {
  return h < 0.1 ? '0h' : h < 10 ? `${h.toFixed(1)}h` : `${Math.round(h)}h`
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getPeriodRange(period: Period): { from: string; to: string; label: string } {
  const now = new Date()
  const today = formatDate(now)

  if (period === 'today') return { from: today, to: today, label: 'Today' }

  if (period === 'week') {
    const mon = new Date(now)
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    return {
      from: formatDate(mon),
      to: formatDate(sun),
      label: `${mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    }
  }

  // month
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    from: formatDate(first),
    to: formatDate(last),
    label: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  }
}

function getMemberHours(m: MemberSummary, period: Period): number {
  if (period === 'today') return m.today_hours ?? 0
  if (period === 'week') return m.current_week_hours
  return m.current_month_hours
}

export default function AdminDashboard({ group, projects, tags, onDeleteGroup }: Props) {
  const [period, setPeriod] = useState<Period>('week')
  const [subTab, setSubTab] = useState<SubTab>('overview')
  const [members, setMembers] = useState<MemberSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState<MemberSummary | null>(null)

  const fetchMembers = useCallback(async (p: Period) => {
    setLoading(true)
    try {
      const url = p === 'today'
        ? `/api/groups/${group.id}/shared-entries?period=today`
        : `/api/groups/${group.id}/shared-entries`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setMembers(data.members ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [group.id])

  useEffect(() => { fetchMembers(period) }, [period, fetchMembers])

  const sharingCount = members.filter(m => m.sharing_enabled).length
  const totalHours = members
    .filter(m => m.sharing_enabled)
    .reduce((s, m) => s + getMemberHours(m, period), 0)

  const periodRange = getPeriodRange(period)

  const periodTabs: { key: Period; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
  ]

  const subTabs: { key: SubTab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Team Overview', icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { key: 'snapshots', label: 'Shared Snapshots', icon: <Share2 className="h-3.5 w-3.5" /> },
    { key: 'manage', label: 'Manage', icon: <Settings className="h-3.5 w-3.5" /> },
  ]

  return (
    <div className="space-y-5">
      {/* Period tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-stone-100 dark:bg-[var(--dark-elevated)] rounded-xl px-1 py-1">
          {periodTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setPeriod(t.key)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                period === t.key
                  ? 'bg-white dark:bg-[var(--dark-card)] text-stone-800 dark:text-stone-100 shadow-sm'
                  : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-stone-400 dark:text-stone-500 hidden sm:block">{periodRange.label}</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] px-4 py-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Clock className="h-3.5 w-3.5 text-indigo-500" />
            <span className="text-xs text-stone-400 dark:text-stone-500">Team Hours</span>
          </div>
          <p className="text-xl font-bold text-stone-800 dark:text-stone-100 tabular-nums">
            {loading ? '...' : formatHours(Math.round(totalHours * 10) / 10)}
          </p>
        </div>
        <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] px-4 py-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Eye className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-xs text-stone-400 dark:text-stone-500">Active Sharers</span>
          </div>
          <p className="text-xl font-bold text-stone-800 dark:text-stone-100">
            {loading ? '...' : `${sharingCount} / ${members.length}`}
          </p>
        </div>
      </div>

      {/* Sub-tab bar */}
      <div className="flex border-b border-stone-200 dark:border-[var(--dark-border)]">
        {subTabs.map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              subTab === t.key
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {subTab === 'overview' && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-40 rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 dark:border-stone-700 p-10 flex flex-col items-center gap-3 text-center">
              <Users className="h-8 w-8 text-stone-300" />
              <p className="font-semibold text-stone-600 dark:text-stone-300">No members yet</p>
              <p className="text-sm text-stone-400 max-w-xs">
                Invite team members from the Manage tab to start tracking together.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map(member => (
                <MemberCard
                  key={member.user_id}
                  member={member}
                  period={period}
                  onViewDetail={userId => {
                    const m = members.find(x => x.user_id === userId)
                    if (m) setSelectedMember(m)
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {subTab === 'snapshots' && (
        <AdminSharesTab groupId={group.id} />
      )}

      {subTab === 'manage' && (
        <AdminMembersPanel group={group} onDeleteGroup={onDeleteGroup} />
      )}

      {/* Member detail dialog */}
      {selectedMember && (
        <MemberDetailDialog
          open={!!selectedMember}
          onOpenChange={open => { if (!open) setSelectedMember(null) }}
          groupId={group.id}
          member={selectedMember}
          periodLabel={periodRange.label}
          dateRange={periodRange}
        />
      )}
    </div>
  )
}
