import { useState, useEffect } from 'react'
import { getCachedSubscription } from '@/auth/authState'
import { isPremiumSubscription, getLimits } from '@/premium/featureGate'
import type { SubscriptionInfo } from '@/types'
import { FREE_LIMITS } from '@shared/constants'
import type { Limits } from '@shared/constants'

interface PremiumState {
  subscription: SubscriptionInfo | null
  isPremium: boolean
  limits: Limits
  loading: boolean
}

export function usePremium() {
  const [state, setState] = useState<PremiumState>({
    subscription: null,
    isPremium: false,
    limits: FREE_LIMITS,
    loading: true,
  })

  useEffect(() => {
    getCachedSubscription().then(sub => {
      setState({
        subscription: sub,
        isPremium: isPremiumSubscription(sub),
        limits: getLimits(sub),
        loading: false,
      })
    })

    // Re-check if subscription refreshed in background (e.g. after upgrade)
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if ('subscriptionInfo' in changes) {
        const sub = changes['subscriptionInfo'].newValue as SubscriptionInfo | undefined ?? null
        setState({
          subscription: sub,
          isPremium: isPremiumSubscription(sub),
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
