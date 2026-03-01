import { useState, useEffect, useCallback } from 'react'
import { getGuestStartedAt, activateGuestMode, clearGuestMode } from '@/storage'
import { GUEST_SESSION_MAX_MS, GUEST_EXPIRY_WARNING_MS } from '@shared/constants'

interface GuestState {
  isGuest: boolean
  loading: boolean
  guestStartedAt: number | null
  daysRemaining: number | null
  isNearExpiry: boolean
  isExpired: boolean
}

export function useGuest() {
  const [state, setState] = useState<GuestState>({
    isGuest: false,
    loading: true,
    guestStartedAt: null,
    daysRemaining: null,
    isNearExpiry: false,
    isExpired: false,
  })

  const refresh = useCallback(async () => {
    const startedAt = await getGuestStartedAt()
    if (startedAt === null) {
      setState({ isGuest: false, loading: false, guestStartedAt: null, daysRemaining: null, isNearExpiry: false, isExpired: false })
      return
    }
    const elapsed = Date.now() - startedAt
    const remainingMs = GUEST_SESSION_MAX_MS - elapsed
    const daysRemaining = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)))
    const isExpired = remainingMs <= 0
    const isNearExpiry = elapsed >= GUEST_EXPIRY_WARNING_MS && !isExpired

    setState({
      isGuest: true,
      loading: false,
      guestStartedAt: startedAt,
      daysRemaining,
      isNearExpiry,
      isExpired,
    })
  }, [])

  useEffect(() => { void refresh() }, [refresh]) // eslint-disable-line react-hooks/set-state-in-effect

  // Listen for storage changes to guestStartedAt
  useEffect(() => {
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && 'guestStartedAt' in changes) {
        void refresh()
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [refresh])

  const enterGuestMode = useCallback(async () => {
    await activateGuestMode()
    await refresh()
  }, [refresh])

  const exitGuestMode = useCallback(async () => {
    await clearGuestMode()
    await refresh()
  }, [refresh])

  return { ...state, enterGuestMode, exitGuestMode, refresh }
}
