'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { useTranslations } from 'next-intl'
import OverviewTab from './OverviewTab'
import DevicesTab from './DevicesTab'
import RecentTab from './RecentTab'
import type { Database } from '@/lib/shared/types'
import type { TimeEntry } from '@/lib/repositories/timeEntries'
import type { ProjectFull } from '@/lib/repositories/projects'
import type { TagFull } from '@/lib/repositories/tags'

type Subscription = Database['public']['Tables']['subscriptions']['Row']
type UserStats = Database['public']['Tables']['user_stats']['Row']
type SyncCursor = Database['public']['Tables']['sync_cursors']['Row']

interface Props {
  subscription: Pick<Subscription, 'plan' | 'status' | 'current_period_end' | 'cancel_at_period_end'> | null
  cursors: Pick<SyncCursor, 'device_id' | 'last_sync'>[]
  recentEntries: TimeEntry[]
  projects: ProjectFull[]
  tags: TagFull[]
  stats: UserStats | null
  isPremium: boolean
  userEmail: string
  defaultHourlyRate: number | null
  currency: string
}

type TabId = 'overview' | 'devices' | 'recent'

export default function DashboardTabs({
  subscription,
  cursors,
  recentEntries,
  projects,
  tags,
  stats,
  isPremium,
  userEmail,
  defaultHourlyRate,
  currency,
}: Props) {
  const t = useTranslations('dashboard.tabs')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const activeTab = (searchParams.get('tab') as TabId) || 'overview'

  const TABS = [
    { id: 'overview' as TabId, label: t('overview') },
    { id: 'devices' as TabId, label: t('devices') },
    { id: 'recent' as TabId, label: t('recent') },
  ]

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
      <div className="flex items-center gap-1 bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] rounded-2xl shadow-sm px-2 py-1.5 mb-6">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)]'
            }`}
          >
            {tab.label}
            {tab.id === 'devices' && cursors.length > 0 && (
              <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full px-1.5 py-0.5">
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
          projects={projects}
          tags={tags}
          defaultHourlyRate={defaultHourlyRate}
          currency={currency}
        />
      )}
      {activeTab === 'devices' && (
        <DevicesTab initialCursors={cursors} isPremium={isPremium} />
      )}
      {activeTab === 'recent' && (
        <RecentTab entries={recentEntries} projects={projects} isPremium={isPremium} />
      )}
    </div>
  )
}
