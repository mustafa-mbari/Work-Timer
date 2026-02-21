'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Users, Plus, Copy, Trash2, UserPlus, RefreshCw, ChevronRight, Mail, Clock } from 'lucide-react'
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

interface Props {
  initialGroups: GroupWithMeta[]
  initialInvitations: InvitationWithGroup[]
}

export default function GroupsView({ initialGroups, initialInvitations }: Props) {
  const [groups, setGroups] = useState(initialGroups)
  const [invitations, setInvitations] = useState(initialInvitations)
  const [activeTab, setActiveTab] = useState<'groups' | 'invitations'>('groups')
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)

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
      // Refresh groups list
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
      setSelectedGroup(null)
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

  const detail = selectedGroup ? groups.find(g => g.id === selectedGroup) : null

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
          {/* Join by code */}
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

          {/* Create group */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groups.map(group => (
                <div
                  key={group.id}
                  className={`rounded-2xl bg-white dark:bg-[var(--dark-card)] border shadow-sm transition-colors cursor-pointer ${
                    selectedGroup === group.id
                      ? 'border-indigo-400 dark:border-indigo-500'
                      : 'border-stone-100 dark:border-[var(--dark-border)] hover:border-stone-200 dark:hover:border-stone-600'
                  }`}
                  onClick={() => setSelectedGroup(selectedGroup === group.id ? null : group.id)}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-stone-800 dark:text-stone-100">{group.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={group.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                            {group.role}
                          </Badge>
                          <span className="text-xs text-stone-400 dark:text-stone-500">
                            {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className={`h-4 w-4 text-stone-300 transition-transform ${selectedGroup === group.id ? 'rotate-90' : ''}`} />
                    </div>

                    {/* Join code */}
                    {group.role === 'admin' && group.join_code && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-stone-50 dark:border-[var(--dark-border)]">
                        <span className="text-xs text-stone-400">Join code:</span>
                        <code className="text-xs font-mono bg-stone-50 dark:bg-[var(--dark-elevated)] px-2 py-0.5 rounded">
                          {group.join_code}
                        </code>
                        <button
                          onClick={e => { e.stopPropagation(); copyJoinCode(group.join_code!) }}
                          className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Expanded detail */}
                  {selectedGroup === group.id && (
                    <GroupDetailInline group={group} onDelete={handleDeleteGroup} />
                  )}
                </div>
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

// Inline detail panel when a group card is expanded
function GroupDetailInline({ group, onDelete }: { group: GroupWithMeta; onDelete: (id: string) => void }) {
  const [members, setMembers] = useState<Array<{ user_id: string; role: string; email: string; display_name: string | null }>>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)

  // Fetch members on mount
  useState(() => {
    fetch(`/api/groups/${group.id}`)
      .then(r => r.json())
      .then(data => {
        setMembers(data.members ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  })

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

  async function handleRegenerateCode() {
    // This would need a dedicated API endpoint. For now, omit.
    toast.info('Feature coming soon')
  }

  return (
    <div className="border-t border-stone-100 dark:border-[var(--dark-border)] px-5 pb-5 pt-4 space-y-4" onClick={e => e.stopPropagation()}>
      {/* Members */}
      <div>
        <p className="text-xs font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-2">Members</p>
        {loading ? (
          <p className="text-sm text-stone-400">Loading...</p>
        ) : (
          <div className="space-y-1.5">
            {members.map(m => (
              <div key={m.user_id} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex-shrink-0">
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
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Badge variant={m.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                    {m.role}
                  </Badge>
                  {group.role === 'admin' && m.user_id !== group.owner_id && (
                    <>
                      <button
                        onClick={() => handleRoleChange(m.user_id, m.role === 'admin' ? 'member' : 'admin')}
                        className="text-xs text-indigo-500 hover:text-indigo-700 px-1"
                        title={m.role === 'admin' ? 'Demote to member' : 'Promote to admin'}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleRemoveMember(m.user_id)}
                        className="text-stone-300 hover:text-rose-500 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite (admin only) */}
      {group.role === 'admin' && (
        <div className="flex items-center gap-2">
          <Input
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleInvite() }}
            placeholder="Invite by email"
            className="text-sm h-8"
          />
          <Button size="sm" variant="outline" className="h-8 rounded-lg gap-1" onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
            <UserPlus className="h-3.5 w-3.5" />
            Invite
          </Button>
        </div>
      )}

      {/* Admin actions */}
      {group.role === 'admin' && (
        <div className="flex items-center gap-2 pt-2 border-t border-stone-50 dark:border-[var(--dark-border)]">
          <Button size="sm" variant="ghost" className="text-xs text-stone-400 gap-1" onClick={handleRegenerateCode}>
            <RefreshCw className="h-3 w-3" />
            New Join Code
          </Button>
          <Button size="sm" variant="ghost" className="text-xs text-rose-400 hover:text-rose-600 gap-1" onClick={() => onDelete(group.id)}>
            <Trash2 className="h-3 w-3" />
            Delete Group
          </Button>
        </div>
      )}
    </div>
  )
}
