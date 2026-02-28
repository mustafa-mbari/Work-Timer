import { requireAdmin } from '@/lib/services/auth'
import { createClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/AdminNav'
import { AdminHeader } from '@/components/AdminHeader'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin()

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('profiles') as any)
    .select('display_name')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex flex-col min-h-screen bg-stone-50 dark:bg-[var(--dark)]">
      <AdminHeader
        email={user.email ?? ''}
        displayName={data?.display_name ?? null}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-8">
          <AdminNav />
          {children}
        </div>
      </div>
    </div>
  )
}
