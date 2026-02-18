'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { User, Clock, Palette, Shield, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserSettingsFull } from '@/lib/repositories/userSettings'
import type { Database } from '@/lib/shared/types'
import ProfileTab from './ProfileTab'
import TimeTrackingTab from './TimeTrackingTab'
import AppearanceTab from './AppearanceTab'
import SecurityTab from './SecurityTab'
import SessionsTab from './SessionsTab'

type Subscription = Pick<
  Database['public']['Tables']['subscriptions']['Row'],
  'plan' | 'status' | 'current_period_end' | 'cancel_at_period_end'
>
type Profile = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'display_name' | 'role'
>
type Cursor = Pick<
  Database['public']['Tables']['sync_cursors']['Row'],
  'device_id' | 'last_sync'
>

interface Props {
  user: { id: string; email: string }
  profile: Profile | null
  subscription: Subscription | null
  settings: UserSettingsFull | null
  cursors: Cursor[]
}

const TABS = [
  { id: 'profile',    label: 'Profile',           icon: User },
  { id: 'time',       label: 'Time Tracking',      icon: Clock },
  { id: 'appearance', label: 'Appearance',          icon: Palette },
  { id: 'security',   label: 'Security',            icon: Shield },
  { id: 'sessions',   label: 'Sessions & Devices',  icon: Monitor },
] as const

type TabId = (typeof TABS)[number]['id']

export default function SettingsLayout({ user, profile, subscription, settings, cursors }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const rawTab = searchParams.get('tab')
  const activeTab: TabId = TABS.some(t => t.id === rawTab)
    ? (rawTab as TabId)
    : 'profile'

  function goToTab(id: TabId) {
    const params = new URLSearchParams(searchParams)
    params.set('tab', id)
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Settings</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Manage your account, preferences, and connected devices
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-0 border-b border-stone-200 dark:border-[var(--dark-border)] overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => goToTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
                active
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300 dark:text-stone-400 dark:hover:text-stone-200 dark:hover:border-stone-600'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'profile' && (
          <ProfileTab user={user} profile={profile} subscription={subscription} />
        )}
        {activeTab === 'time' && (
          <TimeTrackingTab settings={settings} />
        )}
        {activeTab === 'appearance' && (
          <AppearanceTab />
        )}
        {activeTab === 'security' && (
          <SecurityTab userEmail={user.email} />
        )}
        {activeTab === 'sessions' && (
          <SessionsTab initialCursors={cursors} />
        )}
      </div>
    </div>
  )
}
