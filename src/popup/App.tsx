import { useState, useEffect } from 'react'
import type { View } from '@/types'
import TimerView from '@/components/TimerView'
import WeekView from '@/components/WeekView'
import StatsView from '@/components/StatsView'
import SettingsView from '@/components/SettingsView'
import NavBar from '@/components/NavBar'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/components/Toast'

export default function App() {
  const [view, setView] = useState<View>('timer')
  const { showToast } = useToast()
  useTheme()

  useEffect(() => {
    const handler = () => showToast('Storage is full. Delete old entries to free space.', 'error')
    window.addEventListener('storage-quota-exceeded', handler)
    return () => window.removeEventListener('storage-quota-exceeded', handler)
  }, [showToast])

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
