import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {children}
    </div>
  )
}
