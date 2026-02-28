import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import type { View, SyncStatus } from '@/types'
import TimerView from '@/components/TimerView'

// Lazy load non-default views to reduce initial popup load time
const WeekView = lazy(() => import('@/components/WeekView'))
const StatsView = lazy(() => import('@/components/StatsView'))
const SettingsView = lazy(() => import('@/components/SettingsView'))
import ErrorBoundary from '@/components/ErrorBoundary'
import { WeekSkeleton, StatsSkeleton, SettingsSkeleton } from '@/components/ViewSkeleton'
import NavBar from '@/components/NavBar'
import InitialSyncDialog from '@/components/InitialSyncDialog'
import AccountSwitchModal from '@/components/AccountSwitchModal'
import AuthGate from '@/components/AuthGate'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/components/Toast'
import { useAuth } from '@/hooks/useAuth'
import { usePremium } from '@/hooks/usePremium'

export default function App() {
  const [view, setView] = useState<View>('timer')
  const { showToast } = useToast()
  useTheme()

  const { session, loading: authLoading, signIn } = useAuth()
  const { isPremium } = usePremium()

  const [showInitialSync, setShowInitialSync] = useState(false)
  const [localEntryCount, setLocalEntryCount] = useState(0)
  const [localProjectCount, setLocalProjectCount] = useState(0)
  const [showAccountSwitch, setShowAccountSwitch] = useState(false)

  // Check for pending account switch dialog
  useEffect(() => {
    if (!session) return
    chrome.storage.local.get('accountSwitchPending').then(({ accountSwitchPending }) => {
      if (accountSwitchPending) setShowAccountSwitch(true)
    })
  }, [session])

  const handleAccountSwitchChoice = useCallback((choice: 'clear' | 'merge' | 'keep') => {
    setShowAccountSwitch(false)
    chrome.runtime.sendMessage({
      action: 'ACCOUNT_SWITCH_CHOICE',
      payload: { description: choice },
    })
  }, [])

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

  // Track sync status so the navbar can show a subtle syncing indicator
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')

  useEffect(() => {
    // Read initial sync state
    chrome.storage.local.get('syncState').then((result) => {
      const ss = result.syncState as { status?: string } | undefined
      if (ss?.status) setSyncStatus(ss.status as SyncStatus)
    })
    // Listen for live updates while popup is open
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      const nv = changes['syncState']?.newValue as { status?: string } | undefined
      if (nv?.status) {
        setSyncStatus(nv.status as SyncStatus)
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  // On each popup open, trigger a delta sync (session-gated in background)
  useEffect(() => {
    chrome.runtime.sendMessage({ action: 'POPUP_OPENED' }).catch(() => null)
  }, [])

  // Auth gate: show loading spinner or login screen when not authenticated
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[520px] bg-stone-50 dark:bg-dark">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    return <AuthGate signIn={signIn} />
  }

  return (
    <div className="flex flex-col h-[520px] bg-stone-50 dark:bg-dark">
      <main className="flex-1 overflow-y-auto">
        {view === 'timer' && <TimerView />}
        {view === 'week' && (
          <ErrorBoundary compact>
            <Suspense fallback={<WeekSkeleton />}><WeekView /></Suspense>
          </ErrorBoundary>
        )}
        {view === 'stats' && (
          <ErrorBoundary compact>
            <Suspense fallback={<StatsSkeleton />}><StatsView /></Suspense>
          </ErrorBoundary>
        )}
        {view === 'settings' && (
          <ErrorBoundary compact>
            <Suspense fallback={<SettingsSkeleton />}><SettingsView /></Suspense>
          </ErrorBoundary>
        )}
      </main>
      <NavBar currentView={view} onViewChange={setView} syncStatus={syncStatus} />
      <InitialSyncDialog
        isOpen={showInitialSync}
        entryCount={localEntryCount}
        projectCount={localProjectCount}
        onDone={() => setShowInitialSync(false)}
      />
      <AccountSwitchModal
        isOpen={showAccountSwitch}
        onChoice={handleAccountSwitchChoice}
      />
    </div>
  )
}
