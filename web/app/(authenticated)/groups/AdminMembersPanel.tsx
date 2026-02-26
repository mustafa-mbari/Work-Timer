'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Copy, Trash2, UserPlus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import type { GroupWithMeta } from '@/lib/repositories/groups'

interface Props {
  group: GroupWithMeta
  onDeleteGroup: (id: string) => void
}

interface MemberInfo {
  user_id: string
  role: string
  email: string
  display_name: string | null
}

export default function AdminMembersPanel({ group, onDeleteGroup }: Props) {
  const [members, setMembers] = useState<MemberInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/groups/${group.id}`)
      if (res.ok) {
        const data = await res.json()
        setMembers(data.members ?? [])
      }
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
      setMembers(prev => prev.filter(m => m.user_id !== userId))
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
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role: newRole } : m))
      toast.success('Role updated')
    } else {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to update role')
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
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
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
              {m.user_id !== group.owner_id && (
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
            onClick={copyJoinCode}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
            title="Copy join code"
          >
            <Copy className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Invite */}
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

      {/* Delete group */}
      <div className="pt-1">
        <Button
          size="sm"
          variant="ghost"
          className="text-xs text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10 gap-1 px-2"
          onClick={() => onDeleteGroup(group.id)}
        >
          <Trash2 className="h-3 w-3" />
          Delete Group
        </Button>
      </div>
    </div>
  )
}
