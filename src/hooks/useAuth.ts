import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/auth/supabaseClient'
import { signOut as authSignOut } from '@/auth/authState'
import type { AuthSession } from '@/types'
import { WEBSITE_URL } from '@shared/constants'

interface AuthState {
  session: AuthSession | null
  loading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ session: null, loading: true })

  useEffect(() => {
    // Load initial session from chrome.storage (via the Supabase chromeStorageAdapter)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setState({
          session: {
            userId: session.user.id,
            email: session.user.email ?? '',
            accessToken: session.access_token,
            refreshToken: session.refresh_token ?? '',
            expiresAt: session.expires_at ?? 0,
          },
          loading: false,
        })
      } else {
        setState({ session: null, loading: false })
      }
    })

    // Subscribe to future auth state changes (e.g. token refresh, external sign-in)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setState({
          session: {
            userId: session.user.id,
            email: session.user.email ?? '',
            accessToken: session.access_token,
            refreshToken: session.refresh_token ?? '',
            expiresAt: session.expires_at ?? 0,
          },
          loading: false,
        })
      } else {
        setState({ session: null, loading: false })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Opens the companion website login page; the website sends the session back
  // via chrome.runtime.sendMessage (handled by onMessageExternal in background.ts)
  const signIn = useCallback(() => {
    chrome.tabs.create({ url: `${WEBSITE_URL}/login?ext=true` })
  }, [])

  const signOut = useCallback(async () => {
    await authSignOut()
    setState({ session: null, loading: false })
  }, [])

  return { ...state, signIn, signOut }
}
