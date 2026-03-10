import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/auth/supabaseClient'
import { signOut as authSignOut } from '@/auth/authState'
import type { AuthSession } from '@/types'
import { WEBSITE_URL } from '@shared/constants'

interface AuthState {
  session: AuthSession | null
  loading: boolean
}

function mapSession(session: { user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }; access_token: string; refresh_token?: string; expires_at?: number }): AuthSession {
  return {
    userId: session.user.id,
    email: session.user.email ?? '',
    displayName: (session.user.user_metadata?.full_name as string | undefined)
              || (session.user.user_metadata?.name as string | undefined)
              || undefined,
    accessToken: session.access_token,
    refreshToken: session.refresh_token ?? '',
    expiresAt: session.expires_at ?? 0,
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ session: null, loading: true })

  useEffect(() => {
    // Load initial session from chrome.storage (via the Supabase chromeStorageAdapter)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setState({ session: mapSession(session), loading: false })
      } else {
        // Fallback: ask background for session (it may have refreshed successfully
        // even if the popup's Supabase instance lost its token)
        chrome.runtime.sendMessage({ action: 'AUTH_STATE' }).then((resp) => {
          if (resp?.session) {
            setState({ session: resp.session as AuthSession, loading: false })
          } else {
            setState({ session: null, loading: false })
          }
        }).catch(() => {
          setState({ session: null, loading: false })
        })
      }
    })

    // Subscribe to future auth state changes (e.g. token refresh, external sign-in)
    // Only clear session on explicit SIGNED_OUT — ignore transient null sessions
    // from failed token refreshes or race conditions with chrome.storage adapter
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setState({ session: mapSession(session), loading: false })
      } else if (event === 'SIGNED_OUT') {
        setState({ session: null, loading: false })
      }
      // Ignore other events with null session (e.g. TOKEN_REFRESHED failure)
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
