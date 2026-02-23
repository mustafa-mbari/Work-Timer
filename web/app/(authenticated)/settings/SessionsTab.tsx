'use client'

import { useState, useCallback } from 'react'
import { Monitor, Trash2, PlugZap, Check, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Database } from '@/lib/shared/types'

type Cursor = Pick<
  Database['public']['Tables']['sync_cursors']['Row'],
  'device_id' | 'last_sync'
>

interface Props {
  initialCursors: Cursor[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function SessionsTab({ initialCursors }: Props) {
  const [devices, setDevices] = useState<Cursor[]>(initialCursors)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [bridgeStatus, setBridgeStatus] = useState<'idle' | 'connecting' | 'success' | 'failed'>('idle')

  const [bridgeError, setBridgeError] = useState<string | null>(null)

  const handleReconnect = useCallback(async () => {
    setBridgeStatus('connecting')
    setBridgeError(null)

    try {
      // Fetch session from server-side API (avoids browser→Supabase call blocked by corporate proxies)
      const res = await fetch('/api/auth/session')
      if (!res.ok) {
        const msg = 'No active session. Please log in again.'
        setBridgeError(msg)
        setBridgeStatus('failed')
        return
      }

      const { accessToken, refreshToken } = await res.json()

      let resolved = false
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true
          window.removeEventListener('message', handler)
          const msg = 'Extension not detected. Make sure it is installed, enabled, and you have reloaded it with the latest version.'
          setBridgeError(msg)
          setBridgeStatus('failed')
        }
      }, 5000)

      function handler(event: MessageEvent) {
        if (event.source !== window) return
        if (event.data?.type === 'WORK_TIMER_AUTH_RESPONSE') {
          resolved = true
          clearTimeout(timeout)
          window.removeEventListener('message', handler)
          if (event.data.success) {
            setBridgeStatus('success')
            setBridgeError(null)
            toast.success('Extension connected successfully!')
          } else {
            const msg = 'Extension rejected the connection: ' + (event.data.error || 'Unknown error')
            setBridgeError(msg)
            setBridgeStatus('failed')
          }
        }
      }

      window.addEventListener('message', handler)
      window.postMessage({
        type: 'WORK_TIMER_AUTH',
        accessToken,
        refreshToken,
      }, '*')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to get session'
      setBridgeError(msg)
      setBridgeStatus('failed')
    }
  }, [])

  async function handleDisconnect(deviceId: string) {
    setDisconnecting(deviceId)
    // Optimistic removal
    setDevices(prev => prev.filter(d => d.device_id !== deviceId))
    try {
      const res = await fetch('/api/devices', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to disconnect')
      }
      toast.success('Device disconnected')
    } catch (err) {
      // Restore on failure
      setDevices(initialCursors)
      toast.error(err instanceof Error ? err.message : 'Failed to disconnect device')
    } finally {
      setDisconnecting(null)
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Connected devices</CardTitle>
          <CardDescription>
            Chrome Extension instances that are syncing with your account.
            Disconnecting a device stops it from syncing until it re-authenticates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {devices.length === 0 ? (
            <div className="text-center py-8">
              <Monitor className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-stone-600 dark:text-stone-400">No devices connected</p>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                Open the extension and go to Settings → Account to connect
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-stone-100 dark:divide-[var(--dark-border)]">
              {devices.map(device => (
                <li key={device.device_id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="w-9 h-9 rounded-lg bg-stone-100 dark:bg-[var(--dark-elevated)] flex items-center justify-center flex-shrink-0">
                    <Monitor className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                      Chrome Extension
                    </p>
                    <p className="text-xs text-stone-400 dark:text-stone-500 font-mono">
                      {device.device_id.substring(0, 12)}&hellip;
                    </p>
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                      Last synced {formatDate(device.last_sync)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDisconnect(device.device_id)}
                    disabled={disconnecting === device.device_id}
                    className="text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex-shrink-0"
                    title="Disconnect device"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlugZap className="w-5 h-5" />
            Reconnect Extension
          </CardTitle>
          <CardDescription>
            Send your current session to the Work Timer extension on this browser.
            The extension must be installed and enabled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleReconnect}
            disabled={bridgeStatus === 'connecting'}
            variant={bridgeStatus === 'success' ? 'outline' : 'default'}
            className={bridgeStatus === 'success' ? 'border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400' : ''}
          >
            {bridgeStatus === 'connecting' && (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting…
              </>
            )}
            {bridgeStatus === 'success' && (
              <>
                <Check className="w-4 h-4 mr-2" />
                Connected
              </>
            )}
            {(bridgeStatus === 'idle' || bridgeStatus === 'failed') && (
              <>
                <PlugZap className="w-4 h-4 mr-2" />
                Connect Extension
              </>
            )}
          </Button>
          {bridgeError && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-3">
              <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-rose-700 dark:text-rose-300">{bridgeError}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 text-sm text-stone-500 dark:text-stone-400">
          <p>
            <strong className="text-stone-700 dark:text-stone-300">Tip:</strong>{' '}
            To connect a new device, open the Work Timer extension and sign in with your account.
            Sync is only available on the Premium plan.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
