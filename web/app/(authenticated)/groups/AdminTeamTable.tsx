'use client'

import { Eye, EyeOff, FileText, ClipboardCheck } from 'lucide-react'

export interface TeamMember {
  user_id: string
  display_name: string | null
  email: string
  role: string
  sharing_enabled: boolean
  current_share_status: 'open' | 'submitted' | 'approved' | 'overdue' | null
  current_share_id: string | null
}

interface Props {
  members: TeamMember[]
  loading: boolean
  onReviewMember: (member: TeamMember) => void
  onViewMember: (member: TeamMember) => void
}

function getStatusBadge(status: TeamMember['current_share_status']) {
  switch (status) {
    case 'open':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">Open</span>
    case 'submitted':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300">Submitted</span>
    case 'approved':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300">Approved</span>
    case 'overdue':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300">Overdue</span>
    default:
      return <span className="text-xs text-stone-400">--</span>
  }
}

function getInitials(name: string | null, email: string) {
  if (name) {
    return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

export default function AdminTeamTable({ members, loading, onReviewMember, onViewMember }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm overflow-hidden">
        <div className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-stone-200 dark:bg-stone-700" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-32 rounded bg-stone-200 dark:bg-stone-700" />
                <div className="h-2.5 w-48 rounded bg-stone-100 dark:bg-stone-800" />
              </div>
              <div className="h-5 w-16 rounded-full bg-stone-200 dark:bg-stone-700" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-stone-200 dark:border-[var(--dark-border)] p-10 text-center">
        <p className="text-sm text-stone-500 dark:text-stone-400">No members yet. Invite members from the Manage tab.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-100 dark:border-[var(--dark-border)]">
            <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Member</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider hidden sm:table-cell">Role</th>
            <th className="text-center px-4 py-3 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider hidden sm:table-cell">Sharing</th>
            <th className="text-center px-4 py-3 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Status</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Action</th>
          </tr>
        </thead>
        <tbody>
          {members.map(member => (
            <tr
              key={member.user_id}
              className={`border-b border-stone-50 dark:border-[var(--dark-border)] last:border-0 ${
                !member.sharing_enabled ? 'opacity-60' : ''
              }`}
            >
              {/* Member */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-semibold text-indigo-700 dark:text-indigo-300 shrink-0">
                    {getInitials(member.display_name, member.email)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-800 dark:text-stone-100 truncate">
                      {member.display_name || member.email.split('@')[0]}
                    </p>
                    <p className="text-xs text-stone-400 truncate">{member.email}</p>
                  </div>
                </div>
              </td>
              {/* Role */}
              <td className="px-4 py-3 hidden sm:table-cell">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  member.role === 'admin'
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                }`}>
                  {member.role}
                </span>
              </td>
              {/* Sharing */}
              <td className="px-4 py-3 text-center hidden sm:table-cell">
                {member.sharing_enabled
                  ? <Eye className="h-4 w-4 text-emerald-500 mx-auto" />
                  : <EyeOff className="h-4 w-4 text-stone-400 mx-auto" />
                }
              </td>
              {/* Status */}
              <td className="px-4 py-3 text-center">
                {getStatusBadge(member.current_share_status)}
              </td>
              {/* Action */}
              <td className="px-4 py-3 text-right">
                {member.current_share_status === 'submitted' && (
                  <button
                    onClick={() => onReviewMember(member)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                  >
                    <ClipboardCheck className="h-3 w-3" />
                    Review
                  </button>
                )}
                {member.current_share_status === 'approved' && (
                  <button
                    onClick={() => onViewMember(member)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition-colors"
                  >
                    <FileText className="h-3 w-3" />
                    View
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
