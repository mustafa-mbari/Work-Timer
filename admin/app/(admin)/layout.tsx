import { requireAdmin } from '@/lib/services/auth'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar, AdminMobileHeader } from '@/components/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin()

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('profiles') as any)
    .select('display_name')
    .eq('id', user.id)
    .single()

  const email = user.email ?? ''
  const displayName = data?.display_name ?? null

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[var(--dark)]">
      {/* Desktop sidebar */}
      <AdminSidebar email={email} displayName={displayName} />

      {/* Mobile header with hamburger */}
      <AdminMobileHeader email={email} displayName={displayName} />

      {/* Main content */}
      <main className="lg:pl-60">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
