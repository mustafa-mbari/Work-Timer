import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check admin role using service role
  const serviceSupabase = await createServiceClient()
  const { data: profile } = await (serviceSupabase.from('profiles') as any)
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  const navItems = [
    { href: '/admin', label: 'Overview' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/stats', label: 'Statistics' },
    { href: '/admin/domains', label: 'Domains' },
    { href: '/admin/promos', label: 'Promo Codes' },
    { href: '/admin/subscriptions', label: 'Subscriptions' },
  ]

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Admin Dashboard</h1>
          <p className="text-sm text-stone-500">Manage users, plans, and settings</p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-stone-600 hover:text-stone-900 transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <nav className="flex gap-2 mb-8 border-b border-stone-200">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 border-b-2 border-transparent hover:border-indigo-500 transition-colors -mb-px"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  )
}
