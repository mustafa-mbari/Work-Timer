import { useState, useEffect, lazy, Suspense } from 'react'
import type { View } from '@/types'
import TimerView from '@/components/TimerView'

// Lazy load non-default views to reduce initial popup load time
const WeekView = lazy(() => import('@/components/WeekView'))
const StatsView = lazy(() => import('@/components/StatsView'))
const SettingsView = lazy(() => import('@/components/SettingsView'))
import NavBar from '@/components/NavBar'
import InitialSyncDialog from '@/components/InitialSyncDialog'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/components/Toast'
import { useAuth } from '@/hooks/useAuth'
import { usePremium } from '@/hooks/usePremium'

export default function App() {
  const [view, setView] = useState<View>('timer')
  const { showToast } = useToast()
  useTheme()

  const { session } = useAuth()
  const { isPremium } = usePremium()

  const [showInitialSync, setShowInitialSync] = useState(false)
  const [localEntryCount, setLocalEntryCount] = useState(0)
  const [localProjectCount, setLocalProjectCount] = useState(0)

  // Show initial sync dialog once after first login if there is local data to upload
  useEffect(() => {
    if (!session || !isPremium) return

    const check = async () => {
      const { initialSyncDone } = await chrome.storage.local.get('initialSyncDone')
      if (initialSyncDone) return

      const all = await chrome.storage.local.get(null)
      let entryCount = 0
      for (const [key, value] of Object.entries(all)) {
        if (key.startsWith('entries_')) {
          entryCount += (value as unknown[]).length
        }
      }
      const projects: unknown[] = (all['projects'] as unknown[] | undefined) ?? []
      const projectCount = projects.length

      if (entryCount > 0 || projectCount > 0) {
        setLocalEntryCount(entryCount)
        setLocalProjectCount(projectCount)
        setShowInitialSync(true)
      } else {
        await chrome.storage.local.set({ initialSyncDone: true })
      }
    }

    void check()
  }, [session, isPremium])

  useEffect(() => {
    const handler = () => showToast('Storage is full. Delete old entries to free space.', 'error')
    window.addEventListener('storage-quota-exceeded', handler)
    return () => window.removeEventListener('storage-quota-exceeded', handler)
  }, [showToast])

  return (
    <div className="flex flex-col h-[520px] bg-stone-50 dark:bg-dark">
      <main className="flex-1 overflow-y-auto">
        {view === 'timer' && <TimerView />}
        <Suspense fallback={null}>
          {view === 'week' && <WeekView />}
          {view === 'stats' && <StatsView />}
          {view === 'settings' && <SettingsView />}
        </Suspense>
      </main>
      <NavBar currentView={view} onViewChange={setView} />
      <InitialSyncDialog
        isOpen={showInitialSync}
        entryCount={localEntryCount}
        projectCount={localProjectCount}
        onDone={() => setShowInitialSync(false)}
      />
    </div>
  )
}
