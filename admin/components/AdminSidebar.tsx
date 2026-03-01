'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { cn } from '@/lib/utils'
import { useTheme } from '@/lib/theme'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import {
  LayoutDashboard,
  Users,
  UsersRound,
  BarChart3,
  Globe,
  Ticket,
  CreditCard,
  Mail,
  FlaskConical,
  Shield,
  LogOut,
  Sun,
  Moon,
  Menu,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/',               label: 'Overview',       icon: LayoutDashboard, exact: true },
  { href: '/users',          label: 'Users',          icon: Users },
  { href: '/stats',          label: 'Statistics',     icon: BarChart3 },
  { href: '/domains',        label: 'Domains',        icon: Globe },
  { href: '/promos',         label: 'Promo Codes',    icon: Ticket },
  { href: '/subscriptions',  label: 'Subscriptions',  icon: CreditCard },
  { href: '/groups',         label: 'Groups',         icon: UsersRound },
  { href: '/emails',         label: 'Emails',         icon: Mail },
  { href: '/ui-test',        label: 'UI Test',        icon: FlaskConical },
]

interface AdminSidebarProps {
  email: string
  displayName: string | null
}

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
  onClick,
}: {
  href: string
  label: string
  icon: typeof LayoutDashboard
  isActive: boolean
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 h-10 px-3 rounded-lg text-[13px] font-medium transition-colors',
        isActive
          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
          : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-[var(--dark-hover)]'
      )}
    >
      <span
        className={cn(
          'w-8 h-8 flex items-center justify-center shrink-0 rounded-lg transition-colors',
          isActive
            ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
            : ''
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      {label}
    </Link>
  )
}

function SidebarContent({
  email,
  displayName,
  onNavClick,
}: AdminSidebarProps & { onNavClick?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()

  const isActive = (item: typeof NAV_ITEMS[0]) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/')

  async function handleSignOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Branding */}
      <div className="flex items-center gap-2.5 px-4 h-14 shrink-0">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-600">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-sm text-stone-900 dark:text-stone-100 leading-tight">
            Work Timer
          </span>
          <span className="text-[11px] text-stone-400 dark:text-stone-500 leading-tight">
            Admin Panel
          </span>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={isActive(item)}
            onClick={onNavClick}
          />
        ))}
      </nav>

      <Separator />

      {/* Footer: user info + actions */}
      <div className="px-3 py-3 space-y-2 shrink-0">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="flex items-center gap-3 w-full h-9 px-3 rounded-lg text-[13px] text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-[var(--dark-hover)] transition-colors"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="h-4 w-4 shrink-0" />
          ) : (
            <Moon className="h-4 w-4 shrink-0" />
          )}
          {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full h-9 px-3 rounded-lg text-[13px] text-stone-500 dark:text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-stone-100 dark:hover:bg-[var(--dark-hover)] transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>

        <Separator />

        {/* User info */}
        <div className="px-3 pt-1">
          <p className="text-xs font-medium text-stone-700 dark:text-stone-300 truncate">
            {displayName || 'Admin'}
          </p>
          <p className="text-[11px] text-stone-400 dark:text-stone-500 truncate">
            {email}
          </p>
        </div>
      </div>
    </div>
  )
}

export function AdminSidebar({ email, displayName }: AdminSidebarProps) {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 border-r border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)]">
      <SidebarContent email={email} displayName={displayName} />
    </aside>
  )
}

export function AdminMobileHeader({ email, displayName }: AdminSidebarProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <header className="lg:hidden flex items-center gap-3 h-14 px-4 border-b border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] shrink-0">
        <button
          onClick={() => setOpen(true)}
          className="h-9 w-9 flex items-center justify-center rounded-lg text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-[var(--dark-hover)] transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-indigo-600">
            <Shield className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-semibold text-sm text-stone-900 dark:text-stone-100">
            Work Timer Admin
          </span>
        </div>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-60 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent
            email={email}
            displayName={displayName}
            onNavClick={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}
