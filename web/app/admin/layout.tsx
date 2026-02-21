import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/services/auth'
import AppSidebar from '@/app/(authenticated)/Sidebar'
import AppHeader from '@/app/(authenticated)/AppHeader'
import { AdminNav } from './AdminNav'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { SidebarLockProvider } from '@/hooks/use-sidebar-lock'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('profiles') as any)
    .select('display_name, role')
    .eq('id', user!.id)
    .single()

  const userInfo = {
    email: user?.email ?? '',
    displayName: (data?.display_name ?? null) as string | null,
    role: (data?.role ?? 'admin') as 'user' | 'admin',
  }

  const cookieStore = await cookies()
  const sidebarOpen = cookieStore.get('sidebar_state')?.value !== 'false'
  const sidebarLocked = cookieStore.get('sidebar_locked')?.value === 'true'

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <SidebarLockProvider defaultLocked={sidebarLocked}>
        <AppSidebar isAdmin={true} />
        <SidebarInset className="bg-stone-50 dark:bg-[var(--dark)]">
          <AppHeader userInfo={userInfo} />
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1280px] px-8 py-8">
              <AdminNav />
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarLockProvider>
    </SidebarProvider>
  )
}
