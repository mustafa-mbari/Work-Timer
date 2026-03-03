import type { Metadata } from 'next'
import { requireAuth } from '@/lib/services/auth'
import { getProfile } from '@/lib/repositories/profiles'
import SupportPage from './SupportPage'

export const metadata: Metadata = { title: 'Support' }

export default async function Support() {
  const user = await requireAuth()
  const profile = await getProfile(user.id)

  return (
    <SupportPage
      userEmail={user.email ?? ''}
      userName={profile?.display_name ?? null}
    />
  )
}
