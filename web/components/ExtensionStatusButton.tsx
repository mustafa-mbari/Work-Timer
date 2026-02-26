'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plug, PlugZap, WifiOff, Loader2 } from 'lucide-react'

type Status = 'unknown' | 'connecting' | 'connected' | 'failed'

const STORAGE_KEY = 'extension_status'

export function ExtensionStatusButton() {
  const [status, setStatus] = useState<Status>('unknown')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'connected') setStatus('connected')
    else if (saved === 'failed') setStatus('failed')
  }, [])

  const handleReconnect = useCallback(async () => {
    if (status === 'connecting') return
    setStatus('connecting')

    try {
      const res = await fetch('/api/auth/session')
      if (!res.ok) {
        setStatus('failed')
        localStorage.setItem(STORAGE_KEY, 'failed')
        return
      }

      const { accessToken, refreshToken } = await res.json()
      let done = false

      const cleanup = () => {
        done = true
        clearTimeout(timer)
        clearInterval(retryInterval)
        window.removeEventListener('message', handler)
      }

      const handler = (event: MessageEvent) => {
        if (event.source !== window || event.data?.type !== 'WORK_TIMER_AUTH_RESPONSE') return
        cleanup()
        if (event.data.success) {
          setStatus('connected')
          localStorage.setItem(STORAGE_KEY, 'connected')
        } else {
          setStatus('failed')
          localStorage.setItem(STORAGE_KEY, 'failed')
        }
      }

      const timer = setTimeout(() => {
        if (!done) {
          cleanup()
          setStatus('failed')
          localStorage.setItem(STORAGE_KEY, 'failed')
        }
      }, 8000)

      window.addEventListener('message', handler)

      const sendAuth = () => {
        if (!done) window.postMessage({ type: 'WORK_TIMER_AUTH', accessToken, refreshToken }, '*')
      }
      sendAuth()
      const retryInterval = setInterval(sendAuth, 500)
    } catch {
      setStatus('failed')
      localStorage.setItem(STORAGE_KEY, 'failed')
    }
  }, [status])

  const title =
    status === 'connected'
      ? 'Extension connected — click to reconnect'
      : status === 'connecting'
      ? 'Connecting to extension…'
      : status === 'failed'
      ? 'Extension not detected — click to retry'
      : 'Reconnect extension'

  const iconClass = 'h-4 w-4'

  return (
    <button
      onClick={handleReconnect}
      disabled={status === 'connecting'}
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
      {status === 'connecting' ? (
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
