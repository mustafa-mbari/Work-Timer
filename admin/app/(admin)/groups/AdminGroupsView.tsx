'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { UsersRound, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AdminGroup {
  id: string
  name: string
  owner_id: string
  owner_email: string
  join_code: string
  max_members: number
  member_count: number
  created_at: string
}

interface Props {
  initialGroups: AdminGroup[]
}

export default function AdminGroupsView({ initialGroups }: Props) {
  const [groups, setGroups] = useState(initialGroups)
  const [editingMax, setEditingMax] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState<string | null>(null)

  function handleMaxChange(groupId: string, value: string) {
    const num = parseInt(value, 10)
    if (!isNaN(num)) {
      setEditingMax({ ...editingMax, [groupId]: num })
    }
  }

  async function handleSaveMax(groupId: string) {
    const newMax = editingMax[groupId]
    if (newMax == null) return
    setSaving(groupId)
    try {
      const res = await fetch('/api/groups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId, max_members: newMax }),
      })
      if (res.ok) {
        setGroups(groups.map(g => g.id === groupId ? { ...g, max_members: newMax } : g))
        const newEditing = { ...editingMax }
        delete newEditing[groupId]
        setEditingMax(newEditing)
        toast.success('Max members updated')
      } else {
        const data = await res.json()
        toast.error(data.error ?? 'Failed to update')
      }
    } catch {
      toast.error('Failed to update')
    }
    setSaving(null)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
          <UsersRound className="h-4 w-4 text-indigo-500" />
        </div>
        <div>
          <h2 className="font-semibold text-stone-800 dark:text-stone-100">Groups</h2>
          <p className="text-xs text-stone-400">{groups.length} group{groups.length !== 1 ? 's' : ''} total</p>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm p-10 text-center">
          <p className="text-sm text-stone-400">No groups created yet.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 dark:border-[var(--dark-border)] text-left">
                  <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400">Name</th>
                  <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400">Owner</th>
                  <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400">Members</th>
                  <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400">Max</th>
                  <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400">Join Code</th>
                  <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400">Created</th>
                  <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50 dark:divide-[var(--dark-border)]">
                {groups.map(group => (
                  <tr key={group.id} className="hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)]">
                    <td className="px-4 py-3 font-medium text-stone-800 dark:text-stone-200">{group.name}</td>
                    <td className="px-4 py-3 text-stone-500 dark:text-stone-400">{group.owner_email}</td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">{group.member_count}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        value={editingMax[group.id] ?? group.max_members}
                        onChange={e => handleMaxChange(group.id, e.target.value)}
                        className="w-16 text-sm bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] rounded-md px-2 py-1 text-stone-800 dark:text-stone-100 focus:outline-none focus:border-indigo-400"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono bg-stone-50 dark:bg-[var(--dark-elevated)] px-2 py-0.5 rounded">
                        {group.join_code}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-stone-400 text-xs">
                      {new Date(group.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {editingMax[group.id] != null && editingMax[group.id] !== group.max_members && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 gap-1"
                          onClick={() => handleSaveMax(group.id)}
                          disabled={saving === group.id}
                        >
                          <Save className="h-3 w-3" />
                          Save
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
