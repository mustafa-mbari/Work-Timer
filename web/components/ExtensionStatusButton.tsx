'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plug, PlugZap, WifiOff, Loader2 } from 'lucide-react'

type Status = 'probing' | 'unknown' | 'connecting' | 'connected' | 'failed'

// Send a lightweight ping to check if the extension content script is running.
// Retries every retryInterval ms until a pong is received or timeoutMs elapses.
// Content scripts load at document_idle and may not be ready on the first ping.
function pingExtension(
  onResult: (installed: boolean) => void,
  timeoutMs: number,
  retryInterval = 300,
): () => void {
  let done = false
  let interval: ReturnType<typeof setInterval> | null = null

  const cleanup = () => {
    done = true
    clearTimeout(timer)
    if (interval) clearInterval(interval)
    window.removeEventListener('message', handler)
  }

  const handler = (event: MessageEvent) => {
    if (event.source !== window || event.data?.type !== 'WORK_TIMER_PONG') return
    cleanup()
    onResult(true)
  }

  const timer = setTimeout(() => {
    if (!done) {
      cleanup()
      onResult(false)
    }
  }, timeoutMs)

  window.addEventListener('message', handler)

  const send = () => { if (!done) window.postMessage({ type: 'WORK_TIMER_PING' }, '*') }
  send()
  if (retryInterval > 0) interval = setInterval(send, retryInterval)

  return cleanup
}

// Attempt to relay auth to the extension content script.
// Returns a cleanup function.
function relayAuth(
  accessToken: string,
  refreshToken: string,
  onResult: (success: boolean) => void,
  timeoutMs: number,
  retryInterval = 500,
): () => void {
  let done = false
  let interval: ReturnType<typeof setInterval> | null = null

  const cleanup = () => {
    done = true
    clearTimeout(timer)
    if (interval) clearInterval(interval)
    window.removeEventListener('message', handler)
  }

  const handler = (event: MessageEvent) => {
    if (event.source !== window || event.data?.type !== 'WORK_TIMER_AUTH_RESPONSE') return
    cleanup()
    onResult(event.data.success === true)
  }

  const timer = setTimeout(() => {
    if (!done) {
      cleanup()
      onResult(false)
    }
  }, timeoutMs)

  window.addEventListener('message', handler)

  const send = () => {
    if (!done) window.postMessage({ type: 'WORK_TIMER_AUTH', accessToken, refreshToken }, '*')
  }
  send()
  if (retryInterval > 0) interval = setInterval(send, retryInterval)

  return cleanup
}

export function ExtensionStatusButton() {
  // Start as 'probing' — never trust stale state; always verify on mount
  const [status, setStatus] = useState<Status>('probing')

  // Silent auto-probe on mount: ping only (no auth relay), 2s timeout
  useEffect(() => {
    let cancelled = false
    const cleanup = pingExtension(
      (installed) => {
        if (!cancelled) setStatus(installed ? 'connected' : 'unknown')
      },
      2000,
    )
    return () => {
      cancelled = true
      cleanup()
    }
  }, [])

  // Manual reconnect: sends auth tokens, 8s window with 500ms retries
  const handleReconnect = useCallback(async () => {
    if (status === 'connecting') return
    setStatus('connecting')

    try {
      const res = await fetch('/api/auth/session')
      if (!res.ok) {
        setStatus('failed')
        return
      }

      const { accessToken, refreshToken } = await res.json()
      relayAuth(
        accessToken,
        refreshToken,
        (success) => setStatus(success ? 'connected' : 'failed'),
        8000,
        500,
      )
    } catch {
      setStatus('failed')
    }
  }, [status])

  const title =
    status === 'connected'
      ? 'Extension connected — click to reconnect'
      : status === 'connecting'
      ? 'Connecting to extension…'
      : status === 'failed'
      ? 'Extension not detected — click to retry'
      : status === 'probing'
      ? 'Checking extension…'
      : 'Connect extension'

  const iconClass = 'h-4 w-4'

  return (
    <button
      onClick={handleReconnect}
      disabled={status === 'connecting' || status === 'probing'}
      title={title}
      aria-label={title}
      className={`p-1.5 rounded-md transition-colors disabled:cursor-wait ${
        status === 'connected'
          ? 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
          : status === 'failed'
          ? 'text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20'
          : 'text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-[var(--dark-hover)]'
      }`}
    >
      {status === 'connecting' || status === 'probing' ? (
        <Loader2 className={`${iconClass} animate-spin`} />
      ) : status === 'connected' ? (
        <PlugZap className={iconClass} />
      ) : status === 'failed' ? (
        <WifiOff className={iconClass} />
      ) : (
        <Plug className={iconClass} />
      )}
    </button>
  )
}
