import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getSubscriptionFlags } from '@/lib/services/billing'
import LastPageTracker from '@/components/LastPageTracker'
import TabTitleTimer from './TabTitleTimer'
import AppSidebar from './Sidebar'
import AppHeader from './AppHeader'
import { ExtensionBanner } from '@/components/ExtensionBanner'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { SidebarLockProvider } from '@/hooks/use-sidebar-lock'

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data }, { isPremium: premium, isAllIn: allIn }] = await Promise.all([
    (supabase.from('profiles') as any)
      .select('display_name')
      .eq('id', user.id)
      .single(),
    getSubscriptionFlags(user.id),
  ])

  const userInfo = {
    email: user.email ?? '',
    displayName: (data?.display_name ?? null) as string | null,
  }

  // Read sidebar preferences from cookies (written client-side by shadcn sidebar)
  // to match initial server-render state and prevent layout shift on hydration.
  const cookieStore = await cookies()
  const rawMode = cookieStore.get('sidebar_mode')?.value
  const sidebarMode = (['expanded', 'collapsed', 'hover'].includes(rawMode ?? '')
    ? rawMode
    : 'hover') as 'expanded' | 'collapsed' | 'hover'
  const sidebarOpen = sidebarMode === 'expanded'

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <SidebarLockProvider defaultMode={sidebarMode}>
        <AppSidebar isPremium={premium} isAllIn={allIn} userInfo={userInfo} />
        <SidebarInset className="bg-stone-50 dark:bg-[var(--dark)]">
          <AppHeader userInfo={userInfo} />
          <ExtensionBanner />
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[85%] px-8 py-8">
              <LastPageTracker />
              <TabTitleTimer />
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarLockProvider>
    </SidebarProvider>
  )
}
