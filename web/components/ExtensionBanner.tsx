'use client'

import { useState, useEffect } from 'react'
import { X, Download, Chrome } from 'lucide-react'

// TODO: Replace with the actual Chrome Web Store URL once published
const CHROME_STORE_URL = '#'
const DISMISS_KEY = 'extension_banner_dismissed'

function pingExtension(onResult: (installed: boolean) => void, timeoutMs: number): () => void {
  let done = false

  const cleanup = () => {
    done = true
    clearTimeout(timer)
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
  window.postMessage({ type: 'WORK_TIMER_PING' }, '*')

  return cleanup
}

export function ExtensionBanner() {
  // null = not yet determined, true = show, false = hidden
  const [visible, setVisible] = useState<boolean | null>(null)

  useEffect(() => {
    // Don't show if user already dismissed it in this session
    if (sessionStorage.getItem(DISMISS_KEY)) {
      setVisible(false)
      return
    }

    let cancelled = false

    // Use a lightweight ping (no auth relay) to detect if the extension is installed
    const cleanup = pingExtension(
      (installed) => {
        if (!cancelled) setVisible(!installed)
      },
      2000,
    )

    return () => {
      cancelled = true
      cleanup()
    }
  }, [])

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  // Don't render anything until probe completes
  if (!visible) return null

  return (
    <div className="relative flex items-center justify-center gap-3 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800/40 text-sm">
      <Chrome className="h-4 w-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
      <p className="text-indigo-700 dark:text-indigo-300 text-center">
        Get the most out of Work Timer — install the Chrome extension to track time directly from your browser.
      </p>
      <a
        href={CHROME_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors shrink-0"
      >
        <Download className="h-3 w-3" />
        Get Extension
      </a>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="absolute right-3 p-1 rounded text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
