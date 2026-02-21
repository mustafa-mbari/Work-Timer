'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Monitor, Trash2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Database } from '@/lib/shared/types'

type SyncCursor = Database['public']['Tables']['sync_cursors']['Row']

interface Props {
  initialCursors: Pick<SyncCursor, 'device_id' | 'last_sync'>[]
  isPremium: boolean
}

export default function DevicesTab({ initialCursors, isPremium }: Props) {
  const t = useTranslations('dashboard.devices')
  const router = useRouter()
  const [cursors, setCursors] = useState(initialCursors)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  async function handleDisconnect(deviceId: string) {
    setDisconnecting(deviceId)
    const prev = cursors
    setCursors(c => c.filter(x => x.device_id !== deviceId))

    try {
      const res = await fetch('/api/devices', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId }),
      })
      if (!res.ok) {
        setCursors(prev)
        const data = await res.json()
        toast.error(data.error ?? t('disconnectError'))
      } else {
        toast.success(t('disconnected'))
        router.refresh()
      }
    } catch {
      setCursors(prev)
      toast.error(t('networkError'))
    } finally {
      setDisconnecting(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{t('title')}</CardTitle>
        {isPremium && (
          <Button asChild variant="link" size="sm" className="gap-1 pr-0 text-indigo-500">
            <a href="/settings?tab=sessions">
              {t('manageInSettings')} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!isPremium && (
          <div className="mb-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 px-4 py-3 flex items-start gap-3">
            <Monitor className="h-5 w-5 text-indigo-500 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
                {cursors.length >= 1 ? t('morePlanTitle') : t('freePlanTitle')}
              </p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                {cursors.length >= 1 ? t('morePlanDesc') : t('freePlanDesc')}
              </p>
            </div>
            <a
              href="/billing"
              className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition-colors"
            >
              {t('upgrade')}
            </a>
          </div>
        )}

        {cursors.length === 0 ? (
          <div className="py-8 flex flex-col items-center gap-2 text-center">
            <Monitor className="h-10 w-10 text-stone-300 dark:text-stone-600" />
            <p className="text-sm text-stone-500 dark:text-stone-400">{t('empty')}</p>
            <p className="text-xs text-stone-400 dark:text-stone-600">{t('emptyHint')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-[var(--dark-border)]">
            {cursors.map(c => (
              <li key={c.device_id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-stone-100 dark:bg-[var(--dark-elevated)] flex items-center justify-center flex-shrink-0">
                    <Monitor className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-800 dark:text-stone-200">{t('chromeExtension')}</p>
                    <p className="text-xs text-stone-400 dark:text-stone-600 font-mono">
                      {c.device_id.substring(0, 12)}&hellip;
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-stone-400 dark:text-stone-600 hidden sm:block">
                    {new Date(c.last_sync).toLocaleString()}
                  </p>
                  <button
                    onClick={() => handleDisconnect(c.device_id)}
                    disabled={disconnecting === c.device_id}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-900/20 transition-colors disabled:opacity-50"
                    aria-label={t('disconnectLabel')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {cursors.length > 0 && (
          <p className="text-xs text-stone-400 dark:text-stone-600 mt-4">
            {t('footerNote')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
