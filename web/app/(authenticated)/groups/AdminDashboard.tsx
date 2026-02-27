'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Users, ClipboardCheck, FileBarChart, Calendar, Settings, Eye, Plus } from 'lucide-react'
import type { GroupWithMeta } from '@/lib/repositories/groups'
import type { GroupShareWithMeta } from '@/lib/repositories/groupShares'
import AdminTeamTable, { type TeamMember } from './AdminTeamTable'
import PendingReviewsPanel from './PendingReviewsPanel'
import ReportDialog from './ReportDialog'
import ReviewDialog from './ReviewDialog'
import MemberDetailDialog from './MemberDetailDialog'
import ScheduleSettings from './ScheduleSettings'
import CreateShareRequestDialog from './CreateShareRequestDialog'
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
}

interface Props {
  group: GroupWithMeta
  projects: ProjectItem[]
  tags: TagItem[]
  onDeleteGroup: (id: string) => void
}

type SubTab = 'team' | 'reviews' | 'reports' | 'schedule' | 'manage'

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function AdminDashboard({ group, projects, tags, onDeleteGroup }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('team')
  const [memberSummaries, setMemberSummaries] = useState<MemberSummary[]>([])
  const [submittedShares, setSubmittedShares] = useState<GroupShareWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [showReport, setShowReport] = useState(false)
  const [showCreateShare, setShowCreateShare] = useState(false)
  const [reviewShare, setReviewShare] = useState<GroupShareWithMeta | null>(null)
  const [viewMember, setViewMember] = useState<MemberSummary | null>(null)

  // Fetch members + submitted shares for badge count
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [membersRes, sharesRes] = await Promise.all([
        fetch(`/api/groups/${group.id}/shared-entries`),
        fetch(`/api/groups/${group.id}/shares?status=submitted`),
      ])
      if (membersRes.ok) {
        const data = await membersRes.json()
        setMemberSummaries(data.members ?? [])
      }
      if (sharesRes.ok) {
        setSubmittedShares(await sharesRes.json())
      }
    } finally {
      setLoading(false)
    }
  }, [group.id])

  useEffect(() => { fetchData() }, [fetchData])

  // Build team members with current share status
  const teamMembers: TeamMember[] = useMemo(() => {
    const today = formatDate(new Date())
    return memberSummaries.map(m => {
      // Find submitted share for this member
      const submitted = submittedShares.find(s => s.user_id === m.user_id)
      let status: TeamMember['current_share_status'] = null
      let shareId: string | null = null

      if (submitted) {
        status = 'submitted'
        shareId = submitted.id
      } else if (!m.sharing_enabled) {
        status = null
      }
      // Check for overdue: if share has due_date < today and still open
      // We'd need to fetch open shares too for complete overdue detection
      // For now, show submitted status from fetched shares

      return {
        user_id: m.user_id,
        display_name: m.display_name,
        email: m.email,
        role: m.role,
        sharing_enabled: m.sharing_enabled,
        current_share_status: status,
        current_share_id: shareId,
      }
    })
  }, [memberSummaries, submittedShares])

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
    { key: 'manage', label: 'Manage', icon: <Settings className="h-3.5 w-3.5" /> },
  ]

  function handleReviewMember(member: TeamMember) {
    const share = submittedShares.find(s => s.user_id === member.user_id)
    if (share) setReviewShare(share)
  }

  function handleViewMember(member: TeamMember) {
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
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] px-4 py-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Users className="h-3.5 w-3.5 text-indigo-500" />
            <span className="text-xs text-stone-400 dark:text-stone-500">Members</span>
          </div>
          <p className="text-xl font-bold text-stone-800 dark:text-stone-100">
            {loading ? '...' : memberSummaries.length}
          </p>
        </div>
        <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] px-4 py-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Eye className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-xs text-stone-400 dark:text-stone-500">Sharing Enabled</span>
          </div>
          <p className="text-xl font-bold text-stone-800 dark:text-stone-100">
            {loading ? '...' : `${memberSummaries.filter(m => m.sharing_enabled).length} / ${memberSummaries.length}`}
          </p>
        </div>
      </div>

      {/* Sub-tab bar */}
      <div className="flex border-b border-stone-200 dark:border-[var(--dark-border)] overflow-x-auto">
        {subTabs.map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
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
          members={teamMembers}
          loading={loading}
          onReviewMember={handleReviewMember}
          onViewMember={handleViewMember}
        />
      )}

      {subTab === 'reviews' && (
        <PendingReviewsPanel groupId={group.id} />
      )}

      {subTab === 'reports' && (
        <div className="space-y-4">
          <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm p-6 text-center">
            <FileBarChart className="h-10 w-10 text-stone-300 dark:text-stone-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200 mb-1">Team Reports</h3>
            <p className="text-xs text-stone-400 dark:text-stone-500 mb-4 max-w-sm mx-auto">
              Generate detailed reports for any date range. View hours per member, project breakdown, and export as CSV.
            </p>
            <button
              onClick={() => setShowReport(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
            >
              <FileBarChart className="h-3.5 w-3.5" />
              Generate Report
            </button>
          </div>
        </div>
      )}

      {subTab === 'schedule' && (
        <div className="space-y-5">
          {/* Manual share request */}
          <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Plus className="h-4 w-4 text-indigo-500" />
              <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Manual Share Request</h3>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
              Create a one-off share request for all members with sharing enabled. Pick a custom date range and period type.
            </p>
            <button
              onClick={() => setShowCreateShare(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Share Request
            </button>
          </div>

          {/* Recurring schedule */}
          <ScheduleSettings
            groupId={group.id}
            currentFrequency={group.share_frequency ?? null}
            currentDeadlineDay={group.share_deadline_day ?? null}
            onSaved={fetchData}
          />

          <CreateShareRequestDialog
            open={showCreateShare}
            onOpenChange={setShowCreateShare}
            groupId={group.id}
            onCreated={() => { setShowCreateShare(false); fetchData() }}
          />
        </div>
      )}

      {subTab === 'manage' && (
        <AdminMembersPanel group={group} onDeleteGroup={onDeleteGroup} />
      )}

      {/* Report dialog */}
      <ReportDialog
        open={showReport}
        onOpenChange={setShowReport}
        groupId={group.id}
        members={sharingMembers}
      />

      {/* Review dialog */}
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
