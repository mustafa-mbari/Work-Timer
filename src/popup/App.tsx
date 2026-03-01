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
import GuestBanner from '@/components/GuestBanner'
import GuestExpiryAlert from '@/components/GuestExpiryAlert'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/components/Toast'
import { useAuth } from '@/hooks/useAuth'
import { usePremium } from '@/hooks/usePremium'
import { useGuest } from '@/hooks/useGuest'
import { clearAllLocalData } from '@/storage'

export default function App() {
  const [view, setView] = useState<View>('timer')
  const { showToast } = useToast()
  useTheme()

  const { session, loading: authLoading, signIn } = useAuth()
  const { isPremium } = usePremium()
  const { isGuest, loading: guestLoading, daysRemaining, isNearExpiry, isExpired, enterGuestMode, exitGuestMode } = useGuest()

  const [showInitialSync, setShowInitialSync] = useState(false)
  const [localEntryCount, setLocalEntryCount] = useState(0)
  const [localProjectCount, setLocalProjectCount] = useState(0)
  const [showAccountSwitch, setShowAccountSwitch] = useState(false)
  const [showExpiryAlert, setShowExpiryAlert] = useState(false)

  // Show expiry alert on popup open when near expiry
  useEffect(() => {
    if (isGuest && isNearExpiry) {
      setShowExpiryAlert(true) // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [isGuest, isNearExpiry])

  // Handle guest expiry — wipe data and return to AuthGate
  useEffect(() => {
    if (isGuest && isExpired) {
      void clearAllLocalData().then(() => exitGuestMode())
    }
  }, [isGuest, isExpired, exitGuestMode])

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
    if (isGuest) return // No sync status for guests
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
  }, [isGuest])

  // On each popup open, trigger a delta sync (session-gated in background)
  useEffect(() => {
    if (isGuest) return // Skip sync for guests
    chrome.runtime.sendMessage({ action: 'POPUP_OPENED' }).catch(() => null)
  }, [isGuest])

  // Handle guest signup (transition from guest to authenticated)
  const handleGuestSignUp = useCallback(() => {
    signIn()
  }, [signIn])

  // Auth gate: show loading spinner or login screen when not authenticated
  if (authLoading || guestLoading) {
    return (
      <div className="flex items-center justify-center h-[520px] bg-stone-50 dark:bg-dark">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session && !isGuest) {
    return <AuthGate signIn={signIn} onStartGuest={enterGuestMode} />
  }

  return (
    <div className="flex flex-col h-[520px] bg-stone-50 dark:bg-dark">
      {/* Guest Banner — persistent at top */}
      {isGuest && (
        <GuestBanner
          daysRemaining={daysRemaining ?? 0}
          onSignUp={handleGuestSignUp}
        />
      )}
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
      <NavBar currentView={view} onViewChange={setView} syncStatus={isGuest ? 'idle' : syncStatus} />

      {/* Guest Expiry Alert Modal */}
      {isGuest && showExpiryAlert && (
        <GuestExpiryAlert
          daysRemaining={daysRemaining ?? 0}
          onSignUp={handleGuestSignUp}
          onDismiss={() => setShowExpiryAlert(false)}
        />
      )}

      {/* Authenticated-only modals */}
      {session && (
        <>
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
        </>
      )}
    </div>
  )
}
