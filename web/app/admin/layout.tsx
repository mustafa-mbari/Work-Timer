import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/services/auth'
import Sidebar from '@/app/(authenticated)/Sidebar'
import AppHeader from '@/app/(authenticated)/AppHeader'
import { AdminNav } from './AdminNav'

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

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[var(--dark)]">
      <Sidebar isAdmin={true} />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <AppHeader userInfo={userInfo} />
        <main className="flex-1 overflow-y-auto">
          <div className="py-6 lg:py-8 px-[10%] w-full">
            <AdminNav />
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
