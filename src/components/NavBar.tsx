import type { View } from '@/types'
import { TimerIcon, CalendarIcon, ChartIcon, SettingsIcon } from './Icons'

interface NavBarProps {
  currentView: View
  onViewChange: (view: View) => void
}

const tabs: { view: View; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { view: 'timer', label: 'Timer', Icon: TimerIcon },
  { view: 'week', label: 'Week', Icon: CalendarIcon },
  { view: 'stats', label: 'Stats', Icon: ChartIcon },
  { view: 'settings', label: 'Settings', Icon: SettingsIcon },
]

export default function NavBar({ currentView, onViewChange }: NavBarProps) {
  return (
    <nav
      className="flex items-stretch border-t border-stone-200 dark:border-dark-border bg-white dark:bg-dark-card"
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
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors relative ${
              isActive
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
            }`}
          >
            {isActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-indigo-500 dark:bg-indigo-400 rounded-full" />
            )}
            <Icon className="w-[18px] h-[18px]" />
            <span>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
