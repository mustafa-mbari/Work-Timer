'use client'

import { useState } from 'react'
import { Monitor, Trash2 } from 'lucide-react'
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
