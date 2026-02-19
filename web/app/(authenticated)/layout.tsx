import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LastPageTracker from '@/components/LastPageTracker'
import Sidebar from './Sidebar'

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Enforce email verification for email/password users.
  // OAuth providers (Google, etc.) confirm email at the provider level,
  // so email_confirmed_at is always set for them.
  if (!user.email_confirmed_at) {
    const emailParam = user.email
      ? `?email=${encodeURIComponent(user.email)}`
      : ''
    redirect(`/verify-email${emailParam}`)
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <Sidebar />
      <div className="flex-1 min-w-0 px-6 py-8">
        <LastPageTracker />
        {children}
      </div>
    </div>
  )
}
