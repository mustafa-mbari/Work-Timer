'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Users, Plus, UserPlus, Shield, Clock, ChevronDown, Settings2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import AdminDashboard from './AdminDashboard'
import MemberView from './MemberView'

interface ProjectItem { id: string; name: string; color: string }
interface TagItem { id: string; name: string; color: string }

interface OwnStats { today_hours: number; week_hours: number; month_hours: number }

interface Props {
  initialGroups: GroupWithMeta[]
  initialInvitations: InvitationWithGroup[]
  projects: ProjectItem[]
  tags: TagItem[]
  userId: string
  ownStats: OwnStats
}

type AdminView = 'admin' | 'group'

export default function GroupsView({ initialGroups, initialInvitations, projects, tags, userId, ownStats }: Props) {
  const [groups, setGroups] = useState(initialGroups)
  const [invitations, setInvitations] = useState(initialInvitations)
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0]?.id ?? '')
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [adminView, setAdminView] = useState<AdminView>('admin')

  const selectedGroup = groups.find(g => g.id === selectedGroupId)
  const isAdmin = selectedGroup?.role === 'admin'

  // ─── Handlers ──────────────────────────────────────────────────────

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
      const newGroup = { ...group, member_count: 1, role: 'admin' } as GroupWithMeta
      setGroups(prev => [...prev, newGroup])
      setSelectedGroupId(newGroup.id)
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
      if (groupsRes.ok) {
        const updated = await groupsRes.json()
        setGroups(updated)
        if (updated.length) setSelectedGroupId(updated[updated.length - 1].id)
      }
    } else {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to join group')
    }
  }

  async function handleDeleteGroup(groupId: string) {
    const res = await fetch(`/api/groups/${groupId}`, { method: 'DELETE' })
    if (res.ok) {
      const remaining = groups.filter(g => g.id !== groupId)
      setGroups(remaining)
      setSelectedGroupId(remaining[0]?.id ?? '')
      toast.success('Group deleted')
    } else {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to delete group')
    }
  }

  async function handleInvitationAction(invitationId: string, action: 'accept' | 'decline') {
    const res = await fetch('/api/groups/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitation_id: invitationId, action }),
    })
    if (res.ok) {
      setInvitations(prev => prev.filter(i => i.id !== invitationId))
      toast.success(action === 'accept' ? 'Invitation accepted' : 'Invitation declined')
      if (action === 'accept') {
        const groupsRes = await fetch('/api/groups')
        if (groupsRes.ok) {
          const updated = await groupsRes.json()
          setGroups(updated)
          if (updated.length) setSelectedGroupId(updated[updated.length - 1].id)
        }
      }
    } else {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to process invitation')
    }
  }

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header: group selector + actions */}
      <div className="flex items-center justify-between gap-3">
        {/* Group selector */}
        <div className="flex items-center gap-3 min-w-0">
          {groups.length <= 1 ? (
            // Static heading for single group
            selectedGroup ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center flex-shrink-0">
                  <Users className="h-4.5 w-4.5 text-indigo-500 dark:text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 truncate">{selectedGroup.name}</h2>
                    {isAdmin && (
                      <span className="flex items-center gap-0.5 text-xs text-amber-500">
                        <Shield className="h-3 w-3" /> admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-400">{selectedGroup.member_count} member{selectedGroup.member_count !== 1 ? 's' : ''}</p>
                </div>
              </div>
            ) : null
          ) : (
            // Dropdown for multiple groups
            <div className="relative">
              <select
                value={selectedGroupId}
                onChange={e => setSelectedGroupId(e.target.value)}
                className="appearance-none bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] rounded-xl pl-4 pr-10 py-2 text-sm font-semibold text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
              >
                {groups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.member_count} members) {g.role === 'admin' ? '• admin' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
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

      {/* Pending invitations banner */}
      {invitations.length > 0 && (
        <div className="space-y-2">
          {invitations.map(inv => (
            <div
              key={inv.id}
              className="rounded-xl bg-indigo-50 dark:bg-indigo-900/15 border border-indigo-200 dark:border-indigo-800 px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200 truncate">
                  Invitation to join <strong>{inv.group_name}</strong>
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-indigo-500">
                  <Clock className="h-3 w-3" />
                  <span>Expires {new Date(inv.expires_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg text-xs h-7"
                  onClick={() => handleInvitationAction(inv.id, 'decline')}
                >
                  Decline
                </Button>
                <Button
                  size="sm"
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-7"
                  onClick={() => handleInvitationAction(inv.id, 'accept')}
                >
                  Accept
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main content: role-based view */}
      {!selectedGroup ? (
        <div className="rounded-2xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm p-10 flex flex-col items-center gap-3 text-center">
          <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
            <Users className="h-7 w-7 text-indigo-400" />
          </div>
          <p className="font-semibold text-stone-700 dark:text-stone-200">No groups yet</p>
          <p className="text-sm text-stone-400 dark:text-stone-500 max-w-xs">
            Create a group to start collaborating with your team, or join one using a group code.
          </p>
        </div>
      ) : isAdmin ? (
        <div className="space-y-4">
          {/* Admin view switcher */}
          <div className="flex border-b border-stone-200 dark:border-[var(--dark-border)]">
            <button
              onClick={() => setAdminView('admin')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                adminView === 'admin'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
              }`}
            >
              <Settings2 className="h-3.5 w-3.5" />
              Admin
            </button>
            <button
              onClick={() => setAdminView('group')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                adminView === 'group'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
              }`}
            >
              <Send className="h-3.5 w-3.5" />
              My Timesheets
            </button>
          </div>

          {adminView === 'admin' ? (
            <AdminDashboard
              key={selectedGroupId}
              group={selectedGroup}
              projects={projects}
              tags={tags}
              onDeleteGroup={handleDeleteGroup}
            />
          ) : (
            <MemberView
              key={`${selectedGroupId}-member`}
              group={selectedGroup}
              projects={projects}
              tags={tags}
              userId={userId}
              ownStats={ownStats}
            />
          )}
        </div>
      ) : (
        <MemberView
          key={selectedGroupId}
          group={selectedGroup}
          projects={projects}
          tags={tags}
          userId={userId}
          ownStats={ownStats}
        />
      )}
    </div>
  )
}
