import type { Metadata } from 'next'
import { requireAuth } from '@/lib/services/auth'
import { getProfile } from '@/lib/repositories/profiles'
import SuggestionsPage from './SuggestionsPage'

export const metadata: Metadata = { title: 'Suggestions' }

export default async function Suggestions() {
  const user = await requireAuth()
  const profile = await getProfile(user.id)

  return (
    <SuggestionsPage
      userEmail={user.email ?? ''}
      userName={profile?.display_name ?? null}
    />
  )
}
