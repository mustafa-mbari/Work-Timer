import type { FC } from 'react'
import type { View, SyncStatus } from '@/types'
import { TimerIcon, CalendarIcon, ChartIcon, SettingsIcon } from './Icons'

interface NavBarProps {
  currentView: View
  onViewChange: (view: View) => void
  syncStatus?: SyncStatus
}

const tabs: { view: View; label: string; Icon: FC<{ className?: string }> }[] = [
  { view: 'timer', label: 'Timer', Icon: TimerIcon },
  { view: 'week', label: 'Week', Icon: CalendarIcon },
  { view: 'stats', label: 'Stats', Icon: ChartIcon },
  { view: 'settings', label: 'Settings', Icon: SettingsIcon },
]

export default function NavBar({ currentView, onViewChange, syncStatus }: NavBarProps) {
  return (
    <nav
      className="relative flex border-t border-stone-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-[0_-1px_8px_rgba(0,0,0,0.04)]"
      role="tablist"
      aria-label="Main navigation"
    >
      {syncStatus === 'syncing' && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-100 dark:bg-indigo-900/40 overflow-hidden">
          <div className="h-full bg-indigo-500 dark:bg-indigo-400 animate-[slide_1.2s_ease-in-out_infinite]" style={{ width: '40%' }} />
        </div>
      )}
      {tabs.map(({ view, label, Icon }) => {
        const isActive = currentView === view
        return (
          <button
            key={view}
            role="tab"
            aria-selected={isActive}
            aria-label={label}
            onClick={() => onViewChange(view)}
            className={`flex-1 relative flex flex-col items-center justify-center gap-0.5 py-1.5 pt-2 text-[10px] font-medium transition-colors ${
              isActive
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
            }`}
          >
            {isActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-indigo-500 dark:bg-indigo-400 rounded-full" aria-hidden="true" />
            )}
            <Icon className="w-[18px] h-[18px]" />
            <span>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
