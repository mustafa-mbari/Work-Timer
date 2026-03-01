import { useState, useEffect } from 'react'
import { getCachedSubscription } from '@/auth/authState'
import { isPremiumSubscription, getLimits } from '@/premium/featureGate'
import { isGuestMode } from '@/storage'
import type { SubscriptionInfo } from '@/types'
import { FREE_LIMITS, GUEST_LIMITS } from '@shared/constants'
import type { Limits } from '@shared/constants'

interface PremiumState {
  subscription: SubscriptionInfo | null
  isPremium: boolean
  isGuest: boolean
  limits: Limits
  loading: boolean
}

export function usePremium() {
  const [state, setState] = useState<PremiumState>({
    subscription: null,
    isPremium: false,
    isGuest: false,
    limits: FREE_LIMITS,
    loading: true,
  })

  useEffect(() => {
    (async () => {
      const guest = await isGuestMode()
      if (guest) {
        setState({
          subscription: null,
          isPremium: false,
          isGuest: true,
          limits: GUEST_LIMITS,
          loading: false,
        })
        return
      }
      const sub = await getCachedSubscription()
      setState({
        subscription: sub,
        isPremium: isPremiumSubscription(sub),
        isGuest: false,
        limits: getLimits(sub),
        loading: false,
      })
    })()

    // Re-check if subscription refreshed in background (e.g. after upgrade)
    // or if guest mode changes
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if ('guestStartedAt' in changes) {
        if (changes['guestStartedAt'].newValue) {
          setState({
            subscription: null,
            isPremium: false,
            isGuest: true,
            limits: GUEST_LIMITS,
            loading: false,
          })
        } else {
          // Guest mode cleared — re-read subscription
          getCachedSubscription().then(sub => {
            setState({
              subscription: sub,
              isPremium: isPremiumSubscription(sub),
              isGuest: false,
              limits: getLimits(sub),
              loading: false,
            })
          })
        }
        return
      }
      if ('subscriptionInfo' in changes) {
        const sub = changes['subscriptionInfo'].newValue as SubscriptionInfo | undefined ?? null
        setState({
          subscription: sub,
          isPremium: isPremiumSubscription(sub),
          isGuest: false,
          limits: getLimits(sub),
          loading: false,
        })
      }
    }
    chrome.storage.local.onChanged.addListener(listener)
    return () => chrome.storage.local.onChanged.removeListener(listener)
  }, [])

  return state
}
