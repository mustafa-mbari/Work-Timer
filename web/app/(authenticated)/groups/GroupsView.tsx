'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Users, Plus, Copy, Trash2, UserPlus, RefreshCw, Mail, Clock, Shield, Share2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { GroupWithMeta } from '@/lib/repositories/groups'
import type { InvitationWithGroup } from '@/lib/repositories/groupInvitations'
import ShareHistoryTab from './ShareHistoryTab'
import AdminSharesTab from './AdminSharesTab'

interface ProjectItem {
  id: string
  name: string
  color: string
}

interface TagItem {
  id: string
  name: string
  color: string
}

interface Props {
  initialGroups: GroupWithMeta[]
  initialInvitations: InvitationWithGroup[]
  projects: ProjectItem[]
  tags: TagItem[]
}

export default function GroupsView({ initialGroups, initialInvitations, projects, tags }: Props) {
  const [groups, setGroups] = useState(initialGroups)
  const [invitations, setInvitations] = useState(initialInvitations)
  const [activeTab, setActiveTab] = useState<'groups' | 'invitations'>('groups')
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  async function handleCreate() {
    if (!newGroupName.trim()) return
    setCreating(true)
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newGroupName.trim() }),
    })
    setCreating(false)
    if (res.ok) {
      const group = await res.json()
      setGroups([...groups, { ...group, member_count: 1, role: 'admin' }])
      setNewGroupName('')
      setShowCreate(false)
      toast.success('Group created')
    } else {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to create group')
    }
  }

  async function handleJoin() {
    if (!joinCode.trim()) return
    setJoining(true)
    const res = await fetch('/api/groups/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: joinCode.trim() }),
    })
    setJoining(false)
    if (res.ok) {
      const data = await res.json()
      toast.success(`Joined "${data.group_name}"`)
      setJoinCode('')
      setShowJoin(false)
      const groupsRes = await fetch('/api/groups')
      if (groupsRes.ok) setGroups(await groupsRes.json())
    } else {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to join group')
    }
  }

  async function handleInvitationAction(invitationId: string, action: 'accept' | 'decline') {
    const res = await fetch('/api/groups/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitation_id: invitationId, action }),
    })
    if (res.ok) {
      setInvitations(invitations.filter(i => i.id !== invitationId))
      toast.success(action === 'accept' ? 'Invitation accepted' : 'Invitation declined')
      if (action === 'accept') {
        const groupsRes = await fetch('/api/groups')
        if (groupsRes.ok) setGroups(await groupsRes.json())
      }
    } else {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to process invitation')
    }
  }

  async function handleDeleteGroup(groupId: string) {
    const res = await fetch(`/api/groups/${groupId}`, { method: 'DELETE' })
    if (res.ok) {
      setGroups(groups.filter(g => g.id !== groupId))
      setExpandedGroup(null)
      toast.success('Group deleted')
    } else {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to delete group')
    }
  }

  function copyJoinCode(code: string) {
    navigator.clipboard.writeText(code)
    toast.success('Join code copied')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tab bar + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] rounded-xl px-1.5 py-1">
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'groups'
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
            }`}
          >
            My Groups
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'invitations'
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
            }`}
          >
            Invitations
            {invitations.length > 0 && (
              <span className="text-xs bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full px-1.5 py-0.5">
                {invitations.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={showJoin} onOpenChange={setShowJoin}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5">
                <UserPlus className="h-3.5 w-3.5" />
                Join
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join a Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label htmlFor="joinCode">Group Join Code</Label>
                  <Input
                    id="joinCode"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleJoin() }}
                    placeholder="Enter join code"
                    className="mt-1.5"
                  />
                </div>
                <Button onClick={handleJoin} disabled={joining || !joinCode.trim()} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
                  {joining ? 'Joining...' : 'Join Group'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="h-3.5 w-3.5" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label htmlFor="groupName">Group Name</Label>
                  <Input
                    id="groupName"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
                    placeholder="e.g. Design Team"
                    className="mt-1.5"
                  />
                </div>
                <Button onClick={handleCreate} disabled={creating || !newGroupName.trim()} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
                  {creating ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Groups tab */}
      {activeTab === 'groups' && (
        <div className="space-y-4">
          {groups.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm p-10 flex flex-col items-center gap-3 text-center">
              <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                <Users className="h-7 w-7 text-indigo-400" />
              </div>
              <p className="font-semibold text-stone-700 dark:text-stone-200">No groups yet</p>
              <p className="text-sm text-stone-400 dark:text-stone-500 max-w-xs">
                Create a group to start collaborating with your team, or join one using a group code.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map(group => (
                <GroupCard
                  key={group.id}
                  group={group}
                  isExpanded={expandedGroup === group.id}
                  onToggle={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
                  onDelete={handleDeleteGroup}
                  onCopyCode={copyJoinCode}
                  projects={projects}
                  tags={tags}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invitations tab */}
      {activeTab === 'invitations' && (
        <div className="space-y-4">
          {invitations.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm p-10 flex flex-col items-center gap-3 text-center">
              <div className="h-14 w-14 rounded-2xl bg-stone-50 dark:bg-stone-800 flex items-center justify-center">
                <Mail className="h-7 w-7 text-stone-400" />
              </div>
              <p className="font-semibold text-stone-700 dark:text-stone-200">No pending invitations</p>
              <p className="text-sm text-stone-400 dark:text-stone-500 max-w-xs">
                When someone invites you to a group, it will appear here.
              </p>
            </div>
          ) : (
            invitations.map(inv => (
              <div
                key={inv.id}
                className="rounded-2xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm p-5 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-stone-800 dark:text-stone-100">{inv.group_name}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-stone-400 dark:text-stone-500">
                    <Clock className="h-3 w-3" />
                    <span>Expires {new Date(inv.expires_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => handleInvitationAction(inv.id, 'decline')}
                  >
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={() => handleInvitationAction(inv.id, 'accept')}
                  >
                    Accept
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Group Card ────────────────────────────────────────────────────────────────

function GroupCard({
  group,
  isExpanded,
  onToggle,
  onDelete,
  onCopyCode,
  projects,
  tags,
}: {
  group: GroupWithMeta
  isExpanded: boolean
  onToggle: () => void
  onDelete: (id: string) => void
  onCopyCode: (code: string) => void
  projects: ProjectItem[]
  tags: TagItem[]
}) {
  const [innerTab, setInnerTab] = useState<'members' | 'shares' | 'team'>('members')
  const isAdmin = group.role === 'admin'

  return (
    <div className={`rounded-2xl bg-white dark:bg-[var(--dark-card)] border shadow-sm transition-all ${
      isExpanded
        ? 'border-indigo-300 dark:border-indigo-700'
        : 'border-stone-100 dark:border-[var(--dark-border)] hover:border-stone-200 dark:hover:border-stone-600'
    }`}>
      {/* Card header */}
      <button
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-3"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center flex-shrink-0">
            <Users className="h-4.5 w-4.5 text-indigo-500 dark:text-indigo-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-stone-800 dark:text-stone-100 truncate">{group.name}</h3>
              {isAdmin && (
                <span className="flex-shrink-0 flex items-center gap-0.5 text-xs text-amber-500 dark:text-amber-400">
                  <Shield className="h-3 w-3" />
                  <span>admin</span>
                </span>
              )}
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              {group.member_count} member{group.member_count !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className={`h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
          isExpanded ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-stone-100 dark:bg-stone-800'
        }`}>
          <span className={`text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-stone-100 dark:border-[var(--dark-border)]" onClick={e => e.stopPropagation()}>
          {/* Inner tab bar */}
          <div className="flex border-b border-stone-100 dark:border-[var(--dark-border)] px-5">
            <TabButton
              active={innerTab === 'members'}
              onClick={() => setInnerTab('members')}
              icon={<Users className="h-3.5 w-3.5" />}
              label="Members"
            />
            <TabButton
              active={innerTab === 'shares'}
              onClick={() => setInnerTab('shares')}
              icon={<Share2 className="h-3.5 w-3.5" />}
              label="My Shares"
            />
            {isAdmin && (
              <TabButton
                active={innerTab === 'team'}
                onClick={() => setInnerTab('team')}
                icon={<Shield className="h-3.5 w-3.5" />}
                label="Team Data"
              />
            )}
          </div>

          {/* Tab content */}
          <div className="p-5">
            {innerTab === 'members' && (
              <MembersTab group={group} onDelete={onDelete} onCopyCode={onCopyCode} />
            )}
            {innerTab === 'shares' && (
              <ShareHistoryTab groupId={group.id} projects={projects} tags={tags} />
            )}
            {innerTab === 'team' && isAdmin && (
              <AdminSharesTab groupId={group.id} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function TabButton({ active, onClick, icon, label }: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
        active
          ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
          : 'border-transparent text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

// ─── Members Tab ──────────────────────────────────────────────────────────────

function MembersTab({
  group,
  onDelete,
  onCopyCode,
}: {
  group: GroupWithMeta
  onDelete: (id: string) => void
  onCopyCode: (code: string) => void
}) {
  const isAdmin = group.role === 'admin'
  const [members, setMembers] = useState<Array<{
    user_id: string
    role: string
    email: string
    display_name: string | null
    shared_this_month?: boolean
  }>>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [membersRes, sharesRes] = await Promise.all([
        fetch(`/api/groups/${group.id}`),
        fetch(`/api/groups/${group.id}/shares`),
      ])
      const membersData = membersRes.ok ? await membersRes.json() : { members: [] }
      const sharesData = sharesRes.ok ? await sharesRes.json() : []

      // Determine who shared this month
      const now = new Date()
      const thisYYYYMM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const sharedThisMonth = new Set<string>(
        sharesData
          .filter((s: { date_from: string; date_to: string; user_id: string }) => s.date_from.startsWith(thisYYYYMM) || s.date_to.startsWith(thisYYYYMM))
          .map((s: { user_id: string }) => s.user_id)
      )

      setMembers((membersData.members ?? []).map((m: { user_id: string; role: string; email: string; display_name: string | null }) => ({
        ...m,
        shared_this_month: sharedThisMonth.has(m.user_id),
      })))
    } finally {
      setLoading(false)
    }
  }, [group.id])

  useEffect(() => { load() }, [load])

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    const res = await fetch(`/api/groups/${group.id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim() }),
    })
    setInviting(false)
    if (res.ok) {
      toast.success(`Invitation sent to ${inviteEmail}`)
      setInviteEmail('')
    } else {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to invite')
    }
  }

  async function handleRemoveMember(userId: string) {
    const res = await fetch(`/api/groups/${group.id}/members?userId=${userId}`, { method: 'DELETE' })
    if (res.ok) {
      setMembers(members.filter(m => m.user_id !== userId))
      toast.success('Member removed')
    } else {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to remove member')
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    const res = await fetch(`/api/groups/${group.id}/members/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    if (res.ok) {
      setMembers(members.map(m => m.user_id === userId ? { ...m, role: newRole } : m))
      toast.success('Role updated')
    } else {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to update role')
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map(i => (
          <div key={i} className="h-10 rounded-xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Member list */}
      <div className="space-y-1">
        {members.map(m => (
          <div key={m.user_id} className="flex items-center justify-between py-1.5 px-1 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                {(m.display_name || m.email)?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm text-stone-700 dark:text-stone-200 truncate">
                    {m.display_name || m.email}
                  </p>
                  {m.shared_this_month && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" title="Shared this month" />
                  )}
                </div>
                {m.display_name && (
                  <p className="text-xs text-stone-400 truncate">{m.email}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Badge variant={m.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                {m.role}
              </Badge>
              {isAdmin && m.user_id !== group.owner_id && (
                <>
                  <button
                    onClick={() => handleRoleChange(m.user_id, m.role === 'admin' ? 'member' : 'admin')}
                    className="text-stone-300 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors p-1"
                    title={m.role === 'admin' ? 'Demote to member' : 'Promote to admin'}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleRemoveMember(m.user_id)}
                    className="text-stone-300 hover:text-rose-500 transition-colors p-1"
                    title="Remove member"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Join code */}
      {group.join_code && (
        <div className="flex items-center gap-2 pt-2 border-t border-stone-50 dark:border-[var(--dark-border)]">
          <span className="text-xs text-stone-400">Join code:</span>
          <code className="text-xs font-mono bg-stone-50 dark:bg-[var(--dark-elevated)] px-2 py-0.5 rounded text-stone-600 dark:text-stone-300">
            {group.join_code}
          </code>
          <button
            onClick={() => onCopyCode(group.join_code!)}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
            title="Copy join code"
          >
            <Copy className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Invite (admin only) */}
      {isAdmin && (
        <div className="flex items-center gap-2 pt-2 border-t border-stone-50 dark:border-[var(--dark-border)]">
          <Input
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleInvite() }}
            placeholder="Invite by email"
            className="text-sm h-8"
          />
          <Button size="sm" variant="outline" className="h-8 rounded-lg gap-1 flex-shrink-0" onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
            <UserPlus className="h-3.5 w-3.5" />
            Invite
          </Button>
        </div>
      )}

      {/* Delete group (admin only) */}
      {isAdmin && (
        <div className="pt-1">
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10 gap-1 px-2"
            onClick={() => onDelete(group.id)}
          >
            <Trash2 className="h-3 w-3" />
            Delete Group
          </Button>
        </div>
      )}
    </div>
  )
}
