import type { FC } from 'react'
import type { View } from '@/types'
import { TimerIcon, CalendarIcon, ChartIcon, SettingsIcon } from './Icons'

interface NavBarProps {
  currentView: View
  onViewChange: (view: View) => void
}

const tabs: { view: View; label: string; Icon: FC<{ className?: string }> }[] = [
  { view: 'timer', label: 'Timer', Icon: TimerIcon },
  { view: 'week', label: 'Week', Icon: CalendarIcon },
  { view: 'stats', label: 'Stats', Icon: ChartIcon },
  { view: 'settings', label: 'Settings', Icon: SettingsIcon },
]

export default function NavBar({ currentView, onViewChange }: NavBarProps) {
  return (
    <nav
      className="flex border-t border-stone-200 dark:border-dark-border bg-white dark:bg-dark-card"
      role="tablist"
      aria-label="Main navigation"
    >
      {tabs.map(({ view, label, Icon }) => {
        const isActive = currentView === view
        return (
          <button
            key={view}
            role="tab"
            aria-selected={isActive}
            aria-label={label}
            onClick={() => onViewChange(view)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors rounded-lg mx-0.5 ${
              isActive
                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
                : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
            }`}
          >
            <Icon className="w-[18px] h-[18px]" />
            <span>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
