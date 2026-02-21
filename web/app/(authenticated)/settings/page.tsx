import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { requireAuth } from '@/lib/services/auth'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('settings')
  return { title: t('title') }
}
import { getUserSubscription } from '@/lib/repositories/subscriptions'
import { getProfile } from '@/lib/repositories/profiles'
import { getUserSettings } from '@/lib/repositories/userSettings'
import { getUserSyncCursors } from '@/lib/repositories/syncCursors'
import SettingsLayout from './SettingsLayout'

export default async function SettingsPage() {
  const user = await requireAuth()

  const [{ data: subscription }, profile, settings, cursors] = await Promise.all([
    getUserSubscription(user.id),
    getProfile(user.id),
    getUserSettings(user.id),
    getUserSyncCursors(user.id),
  ])

  return (
    <Suspense fallback={<div className="h-64" />}>
      <SettingsLayout
        user={{ id: user.id, email: user.email ?? '' }}
        profile={profile}
        subscription={subscription}
        settings={settings}
        cursors={cursors}
      />
    </Suspense>
  )
}
