'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import OverviewTab from './OverviewTab'
import DevicesTab from './DevicesTab'
import RecentTab from './RecentTab'
import type { Database } from '@/lib/shared/types'
import type { TimeEntry } from '@/lib/repositories/timeEntries'
import type { ProjectSummary } from '@/lib/repositories/projects'

type Subscription = Database['public']['Tables']['subscriptions']['Row']
type UserStats = Database['public']['Tables']['user_stats']['Row']
type SyncCursor = Database['public']['Tables']['sync_cursors']['Row']

interface Props {
  subscription: Pick<Subscription, 'plan' | 'status' | 'current_period_end' | 'cancel_at_period_end'> | null
  cursors: Pick<SyncCursor, 'device_id' | 'last_sync'>[]
  recentEntries: TimeEntry[]
  projects: ProjectSummary[]
  stats: UserStats | null
  isPremium: boolean
  userEmail: string
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'devices', label: 'Devices' },
  { id: 'recent', label: 'Recent Entries' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function DashboardTabs({
  subscription,
  cursors,
  recentEntries,
  projects,
  stats,
  isPremium,
  userEmail,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const activeTab = (searchParams.get('tab') as TabId) || 'overview'

  function switchTab(tab: TabId) {
    const sp = new URLSearchParams(searchParams.toString())
    if (tab === 'overview') sp.delete('tab')
    else sp.set('tab', tab)
    startTransition(() => {
      router.push(`/dashboard?${sp.toString()}`)
    })
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-6">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            className={`relative px-5 py-2 text-sm font-medium rounded-xl transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-[var(--dark-card)] text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-100 dark:border-[var(--dark-border)]'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-[var(--dark-card)]/60'
            }`}
          >
            {tab.label}
            {tab.id === 'devices' && cursors.length > 0 && (
              <span className="ml-1.5 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full px-1.5 py-0.5">
                {cursors.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <OverviewTab
          subscription={subscription}
          stats={stats}
          isPremium={isPremium}
          userEmail={userEmail}
        />
      )}
      {activeTab === 'devices' && (
        <DevicesTab initialCursors={cursors} />
      )}
      {activeTab === 'recent' && (
        <RecentTab entries={recentEntries} projects={projects} isPremium={isPremium} />
      )}
    </div>
  )
}
