import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LastPageTracker from '@/components/LastPageTracker'
import Sidebar from './Sidebar'
import AppHeader from './AppHeader'

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

  if (!user.email_confirmed_at) {
    const emailParam = user.email
      ? `?email=${encodeURIComponent(user.email)}`
      : ''
    redirect(`/verify-email${emailParam}`)
  }

  // Fetch profile for the top header user menu
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('profiles') as any)
    .select('display_name, role')
    .eq('id', user.id)
    .single()

  const userInfo = {
    email: user.email ?? '',
    displayName: (data?.display_name ?? null) as string | null,
    role: (data?.role ?? 'user') as 'user' | 'admin',
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[var(--dark)]">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <AppHeader userInfo={userInfo} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 w-full">
            <LastPageTracker />
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
