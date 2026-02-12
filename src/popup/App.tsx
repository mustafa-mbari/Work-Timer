import { useState } from 'react'
import type { View } from '@/types'
import TimerView from '@/components/TimerView'
import WeekView from '@/components/WeekView'
import StatsView from '@/components/StatsView'
import SettingsView from '@/components/SettingsView'
import NavBar from '@/components/NavBar'
import { useTheme } from '@/hooks/useTheme'

export default function App() {
  const [view, setView] = useState<View>('timer')
  useTheme()

  return (
    <div className="flex flex-col h-[520px] bg-stone-50 dark:bg-dark">
      <main className="flex-1 overflow-y-auto">
        {view === 'timer' && <TimerView />}
        {view === 'week' && <WeekView />}
        {view === 'stats' && <StatsView />}
        {view === 'settings' && <SettingsView />}
      </main>
      <NavBar currentView={view} onViewChange={setView} />
    </div>
  )
}
