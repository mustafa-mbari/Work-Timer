'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Users, ClipboardCheck, FileBarChart, Calendar, Eye, Plus, ListChecks, Clock } from 'lucide-react'
import type { GroupWithMeta } from '@/lib/repositories/groups'
import type { GroupShareListItemWithMeta } from '@/lib/repositories/groupShares'
import AdminTeamTable, { type MergedMember } from './AdminTeamTable'
import PendingReviewsPanel from './PendingReviewsPanel'
import ReportDialog from './ReportDialog'
import ReviewDialog from './ReviewDialog'
import MemberDetailDialog from './MemberDetailDialog'
import ScheduleSettings from './ScheduleSettings'
import CreateShareRequestDialog from './CreateShareRequestDialog'
import { formatDate, formatPeriod } from './utils'
import type { ProjectItem, TagItem } from './utils'
import { Button } from '@/components/ui/button'
import { MemberAvatar } from './MemberAvatar'
import { StatusBadge } from './StatusBadge'

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

interface FullMemberInfo {
  user_id: string
  role: string
  email: string
  display_name: string | null
}

interface Props {
  group: GroupWithMeta
  projects: ProjectItem[]
  tags: TagItem[]
  onDeleteGroup: (id: string) => void
}

type SubTab = 'team' | 'reviews' | 'reports' | 'schedule'

export default function AdminDashboard({ group, projects, tags, onDeleteGroup }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('team')
  const [memberSummaries, setMemberSummaries] = useState<MemberSummary[]>([])
  const [fullMembers, setFullMembers] = useState<FullMemberInfo[]>([])
  const [submittedShares, setSubmittedShares] = useState<GroupShareListItemWithMeta[]>([])
  const [openShares, setOpenShares] = useState<GroupShareListItemWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [showReport, setShowReport] = useState(false)
  const [showCreateShare, setShowCreateShare] = useState(false)
  const [reviewShare, setReviewShare] = useState<GroupShareListItemWithMeta | null>(null)
  const [viewMember, setViewMember] = useState<MemberSummary | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [membersRes, fullMembersRes, sharesRes, openSharesRes] = await Promise.all([
        fetch(`/api/groups/${group.id}/shared-entries`),
        fetch(`/api/groups/${group.id}`),
        fetch(`/api/groups/${group.id}/shares?status=submitted`),
        fetch(`/api/groups/${group.id}/shares?status=open`),
      ])
      if (membersRes.ok) {
        const data = await membersRes.json()
        setMemberSummaries(data.members ?? [])
      }
      if (fullMembersRes.ok) {
        const data = await fullMembersRes.json()
        setFullMembers(data.members ?? [])
      }
      if (sharesRes.ok) {
        setSubmittedShares(await sharesRes.json())
      }
      if (openSharesRes.ok) {
        setOpenShares(await openSharesRes.json())
      }
    } finally {
      setLoading(false)
    }
  }, [group.id])

  // Granular refresh: only re-fetch member summaries + full members (not shares)
  const refreshMembers = useCallback(async () => {
    const [membersRes, fullMembersRes] = await Promise.all([
      fetch(`/api/groups/${group.id}/shared-entries`),
      fetch(`/api/groups/${group.id}`),
    ])
    if (membersRes.ok) {
      const data = await membersRes.json()
      setMemberSummaries(data.members ?? [])
    }
    if (fullMembersRes.ok) {
      const data = await fullMembersRes.json()
      setFullMembers(data.members ?? [])
    }
  }, [group.id])

  useEffect(() => { fetchData() }, [fetchData])

  // Build merged members: combine fullMembers (roles/remove) + memberSummaries (sharing + hours) + submittedShares (status)
  const mergedMembers: MergedMember[] = useMemo(() => {
    return fullMembers.map(fm => {
      const summary = memberSummaries.find(m => m.user_id === fm.user_id)
      const submitted = submittedShares.find(s => s.user_id === fm.user_id)

      let status: MergedMember['current_share_status'] = null
      let shareId: string | null = null
      if (submitted) {
        status = 'submitted'
        shareId = submitted.id
      }

      return {
        user_id: fm.user_id,
        display_name: fm.display_name,
        email: fm.email,
        role: fm.role,
        sharing_enabled: summary?.sharing_enabled ?? false,
        current_share_status: status,
        current_share_id: shareId,
        is_owner: fm.user_id === group.owner_id,
      }
    })
  }, [fullMembers, memberSummaries, submittedShares, group.owner_id])

  const pendingCount = submittedShares.length

  // Members who have sharing enabled (for report dialog)
  const sharingMembers = useMemo(() =>
    memberSummaries.filter(m => m.sharing_enabled).map(m => ({
      user_id: m.user_id,
      display_name: m.display_name,
      email: m.email,
    })),
    [memberSummaries],
  )

  const subTabs: { key: SubTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'team', label: 'Team', icon: <Users className="h-3.5 w-3.5" /> },
    { key: 'reviews', label: 'Reviews', icon: <ClipboardCheck className="h-3.5 w-3.5" />, badge: pendingCount },
    { key: 'reports', label: 'Reports', icon: <FileBarChart className="h-3.5 w-3.5" /> },
    { key: 'schedule', label: 'Schedule', icon: <Calendar className="h-3.5 w-3.5" /> },
  ]

  function handleReviewMember(member: MergedMember) {
    const share = submittedShares.find(s => s.user_id === member.user_id)
    if (share) setReviewShare(share)
  }

  function handleViewMember(member: MergedMember) {
    const ms = memberSummaries.find(m => m.user_id === member.user_id)
    if (ms) setViewMember(ms)
  }

  // Period range for the member detail dialog (current week)
  const now = new Date()
  const mon = new Date(now)
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const periodRange = {
    from: formatDate(mon),
    to: formatDate(sun),
    label: `${mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
  }

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] px-4 py-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Users className="h-3.5 w-3.5 text-indigo-500" />
            <span className="text-xs text-stone-400 dark:text-stone-500">Members</span>
          </div>
          <p className="text-xl font-bold text-stone-800 dark:text-stone-100">
            {loading ? '…' : memberSummaries.length}
          </p>
        </div>
        <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] px-4 py-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Eye className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-xs text-stone-400 dark:text-stone-500">Sharing</span>
          </div>
          <p className="text-xl font-bold text-stone-800 dark:text-stone-100">
            {loading ? '…' : `${memberSummaries.filter(m => m.sharing_enabled).length} / ${memberSummaries.length}`}
          </p>
        </div>
        <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] px-4 py-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            <ClipboardCheck className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs text-stone-400 dark:text-stone-500">Pending Reviews</span>
          </div>
          <p className="text-xl font-bold text-stone-800 dark:text-stone-100">
            {loading ? '…' : pendingCount}
          </p>
        </div>
        <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] px-4 py-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            <ListChecks className="h-3.5 w-3.5 text-purple-500" />
            <span className="text-xs text-stone-400 dark:text-stone-500">Open Shares</span>
          </div>
          <p className="text-xl font-bold text-stone-800 dark:text-stone-100">
            {loading ? '…' : openShares.length}
          </p>
        </div>
      </div>

      {/* Sub-tab bar */}
      <div className="flex border-b border-stone-200 dark:border-[var(--dark-border)] overflow-x-auto">
        {subTabs.map(t => (
          <button
            key={t.key}
            onClick={() => {
              setSubTab(t.key)
              if (t.key === 'reports') setShowReport(true)
            }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              subTab === t.key
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
            }`}
          >
            {t.icon}
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {subTab === 'team' && (
        <AdminTeamTable
          group={group}
          members={mergedMembers}
          loading={loading}
          onReviewMember={handleReviewMember}
          onViewMember={handleViewMember}
          onMemberUpdate={refreshMembers}
          onDeleteGroup={onDeleteGroup}
        />
      )}

      {subTab === 'reviews' && (
        <PendingReviewsPanel groupId={group.id} />
      )}

      {subTab === 'reports' && (
        <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                <FileBarChart className="h-4.5 w-4.5 text-indigo-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Team Reports</h3>
                <p className="text-xs text-stone-400 dark:text-stone-500">
                  Generate reports for any date range and export as CSV.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowReport(true)}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
            >
              <FileBarChart className="h-3.5 w-3.5" />
              Generate Report
            </Button>
          </div>
        </div>
      )}

      {subTab === 'schedule' && (
        <div className="space-y-5">
          {/* Open share requests card */}
          <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-stone-100 dark:border-[var(--dark-border)]">
              <ListChecks className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Open Share Requests</h3>
              {openShares.length > 0 && (
                <span className="ml-auto px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
                  {openShares.length} open
                </span>
              )}
            </div>

            {loading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="h-7 w-7 rounded-full bg-stone-200 dark:bg-stone-700" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-32 rounded bg-stone-200 dark:bg-stone-700" />
                      <div className="h-2.5 w-48 rounded bg-stone-100 dark:bg-stone-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : openShares.length === 0 ? (
              <div className="px-5 py-6 text-center">
                <p className="text-sm text-stone-500 dark:text-stone-400">No open share requests</p>
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                  Create a manual request below or configure a recurring schedule.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-stone-50 dark:divide-[var(--dark-border)]">
                {openShares.map(share => (
                  <div key={share.id} className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50/50 dark:hover:bg-[var(--dark-hover)] transition-colors">
                    <MemberAvatar name={share.sharer_name} email={share.sharer_email} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800 dark:text-stone-100 truncate">
                        {share.sharer_name || share.sharer_email.split('@')[0]}
                      </p>
                      <p className="text-xs text-stone-400 dark:text-stone-500">
                        {formatPeriod(share)}
                      </p>
                    </div>
                    {share.due_date ? (
                      <div className="flex items-center gap-1 text-xs text-stone-400 dark:text-stone-500 shrink-0">
                        <Clock className="h-3 w-3" />
                        <span>Due {new Date(share.due_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </div>
                    ) : null}
                    <StatusBadge status="open" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Manual + Recurring — 2-column on lg+ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Plus className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Manual Share Request</h3>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
                Create a one-off share request for all members with sharing enabled.
              </p>
              <Button
                onClick={() => setShowCreateShare(true)}
                className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Share Request
              </Button>
            </div>

            <ScheduleSettings
              groupId={group.id}
              currentFrequency={group.share_frequency ?? null}
              currentDeadlineDay={group.share_deadline_day ?? null}
              onSaved={fetchData}
            />
          </div>

          <CreateShareRequestDialog
            open={showCreateShare}
            onOpenChange={setShowCreateShare}
            groupId={group.id}
            onCreated={() => { setShowCreateShare(false); fetchData() }}
          />
        </div>
      )}

      {/* Report dialog */}
      <ReportDialog
        open={showReport}
        onOpenChange={setShowReport}
        groupId={group.id}
        members={sharingMembers}
      />

      {/* Review dialog (triggered from Team tab) */}
      {reviewShare && (
        <ReviewDialog
          open={!!reviewShare}
          onOpenChange={(open) => { if (!open) setReviewShare(null) }}
          share={reviewShare}
          groupId={group.id}
          onReviewed={() => {
            setReviewShare(null)
            fetchData()
          }}
        />
      )}

      {/* Member detail dialog (for approved shares) */}
      {viewMember && (
        <MemberDetailDialog
          open={!!viewMember}
          onOpenChange={open => { if (!open) setViewMember(null) }}
          groupId={group.id}
          member={viewMember}
          periodLabel={periodRange.label}
          dateRange={periodRange}
        />
      )}
    </div>
  )
}
