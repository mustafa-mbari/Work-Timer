'use client'

import { useState, useEffect, useCallback } from 'react'
import { Share2, Settings, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { GroupWithMeta } from '@/lib/repositories/groups'
import ShareHistoryTab from './ShareHistoryTab'
import SharingSettingsPanel from './SharingSettingsPanel'

interface ProjectItem { id: string; name: string; color: string }
interface TagItem { id: string; name: string; color: string }

interface Props {
  group: GroupWithMeta
  projects: ProjectItem[]
  tags: TagItem[]
}

type Tab = 'shares' | 'settings' | 'members'

interface MemberInfo {
  user_id: string
  role: string
  email: string
  display_name: string | null
}

export default function MemberView({ group, projects, tags }: Props) {
  const [tab, setTab] = useState<Tab>('shares')
  const [members, setMembers] = useState<MemberInfo[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  const loadMembers = useCallback(async () => {
    setMembersLoading(true)
    try {
      const res = await fetch(`/api/groups/${group.id}`)
      if (res.ok) {
        const data = await res.json()
        setMembers(data.members ?? [])
      }
    } finally {
      setMembersLoading(false)
    }
  }, [group.id])

  useEffect(() => {
    if (tab === 'members' && members.length === 0) loadMembers()
  }, [tab, members.length, loadMembers])

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'shares', label: 'My Shares', icon: <Share2 className="h-3.5 w-3.5" /> },
    { key: 'settings', label: 'Sharing Settings', icon: <Settings className="h-3.5 w-3.5" /> },
    { key: 'members', label: 'Members', icon: <Users className="h-3.5 w-3.5" /> },
  ]

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex border-b border-stone-200 dark:border-[var(--dark-border)]">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'shares' && (
        <ShareHistoryTab groupId={group.id} projects={projects} tags={tags} />
      )}

      {tab === 'settings' && (
        <SharingSettingsPanel groupId={group.id} projects={projects} />
      )}

      {tab === 'members' && (
        <div className="space-y-1">
          {membersLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 rounded-xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-8">No members found</p>
          ) : (
            members.map(m => (
              <div
                key={m.user_id}
                className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex-shrink-0">
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
                <Badge variant={m.role === 'admin' ? 'default' : 'secondary'} className="text-xs flex-shrink-0">
                  {m.role}
                </Badge>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
