'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Eye, EyeOff, ClipboardCheck, FileText, RefreshCw,
  Trash2, UserPlus, Copy, ShieldCheck,
} from 'lucide-react'
import type { GroupWithMeta } from '@/lib/repositories/groups'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export interface MergedMember {
  user_id: string
  display_name: string | null
  email: string
  role: string
  sharing_enabled: boolean
  current_share_status: 'open' | 'submitted' | 'approved' | 'overdue' | null
  current_share_id: string | null
  is_owner: boolean
}

// Keep backwards-compatible alias
export type TeamMember = MergedMember

interface Props {
  group: GroupWithMeta
  members: MergedMember[]
  loading: boolean
  onReviewMember: (member: MergedMember) => void
  onViewMember: (member: MergedMember) => void
  onMemberUpdate: () => void
  onDeleteGroup: (id: string) => void
}

function getInitials(name: string | null, email: string) {
  if (name) return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

function StatusBadge({ status }: { status: MergedMember['current_share_status'] }) {
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
      return <span className="text-xs text-stone-400 dark:text-stone-500">—</span>
  }
}

export default function AdminTeamTable({
  group, members, loading, onReviewMember, onViewMember, onMemberUpdate, onDeleteGroup,
}: Props) {
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [togglingSharing, setTogglingSharing] = useState<string | null>(null)
  const [togglingRole, setTogglingRole] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  async function handleToggleSharing(member: MergedMember) {
    setTogglingSharing(member.user_id)
    try {
      const res = await fetch(`/api/groups/${group.id}/sharing?userId=${member.user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sharing_enabled: !member.sharing_enabled }),
      })
      if (res.ok) {
        toast.success(member.sharing_enabled ? 'Sharing disabled' : 'Sharing enabled')
        onMemberUpdate()
      } else {
        const data = await res.json()
        toast.error(data.error ?? 'Failed to update sharing')
      }
    } finally {
      setTogglingSharing(null)
    }
  }

  async function handleToggleRole(member: MergedMember) {
    const newRole = member.role === 'admin' ? 'member' : 'admin'
    setTogglingRole(member.user_id)
    try {
      const res = await fetch(`/api/groups/${group.id}/members/${member.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      if (res.ok) {
        toast.success(`Role updated to ${newRole}`)
        onMemberUpdate()
      } else {
        const data = await res.json()
        toast.error(data.error ?? 'Failed to update role')
      }
    } finally {
      setTogglingRole(null)
    }
  }

  async function handleRemove(member: MergedMember) {
    setRemoving(member.user_id)
    try {
      const res = await fetch(`/api/groups/${group.id}/members?userId=${member.user_id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Member removed')
        onMemberUpdate()
      } else {
        const data = await res.json()
        toast.error(data.error ?? 'Failed to remove member')
      }
    } finally {
      setRemoving(null)
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      const res = await fetch(`/api/groups/${group.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      })
      if (res.ok) {
        toast.success(`Invitation sent to ${inviteEmail}`)
        setInviteEmail('')
      } else {
        const data = await res.json()
        toast.error(data.error ?? 'Failed to invite')
      }
    } finally {
      setInviting(false)
    }
  }

  function copyJoinCode() {
    if (group.join_code) {
      navigator.clipboard.writeText(group.join_code)
      toast.success('Join code copied')
    }
  }

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

  return (
    <div className="space-y-4">
      {/* Main table card */}
      <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm overflow-hidden">
        {members.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-stone-500 dark:text-stone-400">No members yet. Use the invite section below to add members.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 dark:border-[var(--dark-border)] bg-stone-50/60 dark:bg-[var(--dark-elevated)]">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Member</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Role</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Sharing</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50 dark:divide-[var(--dark-border)]">
                {members.map(member => (
                  <tr
                    key={member.user_id}
                    className={`transition-colors hover:bg-stone-50/50 dark:hover:bg-[var(--dark-hover)] ${!member.sharing_enabled ? 'opacity-70' : ''}`}
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
                          <p className="text-xs text-stone-400 dark:text-stone-500 truncate">{member.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {member.role === 'admin' && (
                          <ShieldCheck className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        )}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          member.role === 'admin'
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                        }`}>
                          {member.role}
                        </span>
                        {!member.is_owner && (
                          <button
                            onClick={() => handleToggleRole(member)}
                            disabled={togglingRole === member.user_id}
                            className="text-stone-300 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors p-0.5 disabled:opacity-50"
                            title={member.role === 'admin' ? 'Demote to member' : 'Promote to admin'}
                          >
                            <RefreshCw className={`h-3 w-3 ${togglingRole === member.user_id ? 'animate-spin' : ''}`} />
                          </button>
                        )}
                        {member.is_owner && (
                          <span className="text-[10px] text-stone-400 dark:text-stone-500 italic">owner</span>
                        )}
                      </div>
                    </td>

                    {/* Sharing toggle */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleSharing(member)}
                        disabled={togglingSharing === member.user_id}
                        className={`mx-auto flex items-center justify-center h-7 w-7 rounded-lg transition-colors disabled:opacity-50 ${
                          member.sharing_enabled
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                        }`}
                        title={member.sharing_enabled ? 'Disable sharing' : 'Enable sharing'}
                      >
                        {member.sharing_enabled
                          ? <Eye className="h-3.5 w-3.5" />
                          : <EyeOff className="h-3.5 w-3.5" />
                        }
                      </button>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={member.current_share_status} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {member.current_share_status === 'submitted' && (
                          <button
                            onClick={() => onReviewMember(member)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                          >
                            <ClipboardCheck className="h-3 w-3" />
                            Review
                          </button>
                        )}
                        {member.current_share_status === 'approved' && (
                          <button
                            onClick={() => onViewMember(member)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition-colors"
                          >
                            <FileText className="h-3 w-3" />
                            View
                          </button>
                        )}
                        {!member.is_owner && (
                          <button
                            onClick={() => handleRemove(member)}
                            disabled={removing === member.user_id}
                            className="flex items-center justify-center h-7 w-7 rounded-lg text-stone-300 dark:text-stone-600 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors disabled:opacity-50"
                            title="Remove member"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Invite + join code footer */}
        <div className="border-t border-stone-100 dark:border-[var(--dark-border)] px-4 py-3 space-y-3 bg-stone-50/40 dark:bg-[var(--dark-elevated)]">
          {/* Invite row */}
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-stone-400 shrink-0" />
            <Input
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleInvite() }}
              placeholder="Invite member by email…"
              className="text-sm h-8 flex-1"
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-lg gap-1 shrink-0"
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
            >
              {inviting ? 'Sending…' : 'Invite'}
            </Button>
          </div>

          {/* Join code row */}
          {group.join_code && (
            <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
              <span>Join code:</span>
              <code className="font-mono bg-white dark:bg-[var(--dark-card)] px-2 py-0.5 rounded text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-[var(--dark-border)]">
                {group.join_code}
              </code>
              <button
                onClick={copyJoinCode}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                title="Copy join code"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Danger zone */}
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="ghost"
          className="text-xs text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10 gap-1.5 px-3"
          onClick={() => onDeleteGroup(group.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete Group
        </Button>
      </div>
    </div>
  )
}
