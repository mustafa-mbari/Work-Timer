import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NavLink } from '@/components/NavLink'
import { UserMenu } from '@/components/UserMenu'
import { MobileMenu } from '@/components/MobileMenu'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Timer } from 'lucide-react'

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch profile for display name and role if logged in
  let profile: { display_name: string | null; role: 'user' | 'admin' } | null = null
  if (user) {
    const { data } = await (supabase
      .from('profiles') as any)
      .select('display_name, role')
      .eq('id', user.id)
      .single()
    if (data) {
      profile = { display_name: data.display_name, role: data.role }
    }
  }

  const userInfo = user && profile ? {
    email: user.email || '',
    displayName: profile.display_name,
    role: profile.role,
  } : null

  return (
    <nav className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40 dark:bg-[var(--dark)]/80 dark:border-[var(--dark-border)]">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-stone-900 dark:text-stone-100 text-sm tracking-tight">
          <Timer className="h-5 w-5 text-indigo-500" />
          Work Timer
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {userInfo ? (
            <>
              <NavLink
                href="/dashboard"
                className="px-3 py-1.5 text-sm rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-[var(--dark-hover)]"
                activeClassName="!text-indigo-600 !bg-indigo-50 font-medium dark:!text-indigo-400 dark:!bg-indigo-900/20"
              >
                Dashboard
              </NavLink>
              <NavLink
                href="/analytics"
                className="px-3 py-1.5 text-sm rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-[var(--dark-hover)]"
                activeClassName="!text-indigo-600 !bg-indigo-50 font-medium dark:!text-indigo-400 dark:!bg-indigo-900/20"
              >
                Analytics
              </NavLink>
              <NavLink
                href="/billing"
                className="px-3 py-1.5 text-sm rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-[var(--dark-hover)]"
                activeClassName="!text-indigo-600 !bg-indigo-50 font-medium dark:!text-indigo-400 dark:!bg-indigo-900/20"
              >
                Billing
              </NavLink>
              <div className="w-px h-5 bg-stone-200 mx-2 dark:bg-[var(--dark-border)]" />
              <ThemeToggle />
              <div className="ml-1">
                <UserMenu
                  email={userInfo.email}
                  displayName={userInfo.displayName}
                  role={userInfo.role}
                />
              </div>
            </>
          ) : (
            <>
              <ThemeToggle />
              <div className="w-px h-5 bg-stone-200 mx-2 dark:bg-[var(--dark-border)]" />
              <Link
                href="/login"
                className="px-3 py-1.5 text-sm text-stone-600 hover:text-stone-900 transition-colors dark:text-stone-400 dark:hover:text-stone-100"
              >
                Sign in
              </Link>
              <Button asChild size="sm">
                <Link href="/register">Get started</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile menu trigger */}
        <MobileMenu user={userInfo} />
      </div>
    </nav>
  )
}
