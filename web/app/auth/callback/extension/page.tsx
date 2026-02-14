import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ExtensionBridge from './ExtensionBridge'

export default async function ExtensionCallbackPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login?error=no_session')
  }

  return (
    <ExtensionBridge
      accessToken={session.access_token}
      refreshToken={session.refresh_token}
    />
  )
}
