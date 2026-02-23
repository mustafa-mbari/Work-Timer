'use client'

import { useEffect, useState } from 'react'

interface ExtensionBridgeProps {
  accessToken: string
  refreshToken: string
}

export default function ExtensionBridge({ accessToken, refreshToken }: ExtensionBridgeProps) {
  const [status, setStatus] = useState<'connecting' | 'success' | 'timeout'>('connecting')

  useEffect(() => {
    let done = false

    const timer = setTimeout(() => {
      if (!done) {
        done = true
        setStatus('timeout')
      }
    }, 8000)

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return
      if (event.data?.type === 'WORK_TIMER_AUTH_RESPONSE') {
        done = true
        clearTimeout(timer)
        clearInterval(retryInterval)
        if (event.data.success) {
          setStatus('success')
        } else {
          console.error('[Extension Bridge] Auth failed:', event.data.error)
          setStatus('timeout')
        }
      }
    }

    window.addEventListener('message', handleMessage)

    const sendAuth = () => {
      if (done) return
      window.postMessage({
        type: 'WORK_TIMER_AUTH',
        accessToken,
        refreshToken,
      }, '*')
    }

    // Send immediately, then retry every 500ms — content script may load after React
    sendAuth()
    const retryInterval = setInterval(sendAuth, 500)

    return () => {
      done = true
      clearTimeout(timer)
      clearInterval(retryInterval)
      window.removeEventListener('message', handleMessage)
    }
  }, [accessToken, refreshToken])

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center">
        {status === 'connecting' && (
          <>
            <div className="w-12 h-12 rounded-full bg-indigo-100 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-stone-900 mb-2">Connecting to extension…</h1>
            <p className="text-sm text-stone-500">Please wait while we sync your account.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-12 h-12 rounded-full bg-emerald-100 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-stone-900 mb-2">Connected!</h1>
            <p className="text-sm text-stone-500 mb-6">
              Your Work Timer extension is now synced. You can close this page and use the extension.
            </p>
            <a
              href="/dashboard"
              className="inline-block px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Go to Dashboard
            </a>
          </>
        )}

        {status === 'timeout' && (
          <>
            <div className="w-12 h-12 rounded-full bg-amber-100 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-stone-900 mb-2">Extension not detected</h1>
            <p className="text-sm text-stone-500 mb-6">
              Make sure the Work Timer extension is installed and enabled in Chrome, then open the extension popup and go to Settings → Account to complete sign-in.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="https://chrome.google.com/webstore"
                className="px-4 py-2 border border-stone-200 hover:bg-stone-50 text-stone-700 text-sm font-medium rounded-lg transition-colors"
              >
                Install Extension
              </a>
              <a
                href="/dashboard"
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Continue to Dashboard
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
