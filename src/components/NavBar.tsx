import type { View } from '@/types'

interface NavBarProps {
  currentView: View
  onViewChange: (view: View) => void
}

const tabs: { view: View; label: string; icon: string }[] = [
  { view: 'timer', label: 'Timer', icon: '⏱' },
  { view: 'week', label: 'Week', icon: '📅' },
  { view: 'stats', label: 'Stats', icon: '📊' },
  { view: 'settings', label: 'Settings', icon: '⚙' },
]

export default function NavBar({ currentView, onViewChange }: NavBarProps) {
  return (
    <nav className="flex border-t border-gray-200 bg-white" role="tablist" aria-label="Main navigation">
      {tabs.map(({ view, label, icon }) => (
        <button
          key={view}
          role="tab"
          aria-selected={currentView === view}
          aria-label={label}
          onClick={() => onViewChange(view)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
            currentView === view
              ? 'text-blue-600 border-t-2 border-blue-600 -mt-px'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="text-base" aria-hidden="true">{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
