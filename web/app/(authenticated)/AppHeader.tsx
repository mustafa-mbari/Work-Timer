'use client'

import { usePathname } from 'next/navigation'
import { Bell, Search, Menu } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { UserMenu } from '@/components/UserMenu'

const PAGE_META: { match: string; breadcrumb: string; title: string }[] = [
  { match: '/dashboard',  breadcrumb: 'Pages / Dashboard', title: 'Main Dashboard' },
  { match: '/analytics',  breadcrumb: 'Pages / Analytics', title: 'Analytics' },
  { match: '/entries',    breadcrumb: 'Pages / Entries',   title: 'Time Entries' },
  { match: '/billing',    breadcrumb: 'Pages / Billing',   title: 'Billing & Plans' },
  { match: '/settings',   breadcrumb: 'Pages / Settings',  title: 'Settings' },
]

interface UserInfo {
  email: string
  displayName: string | null
  role: 'user' | 'admin'
}

interface Props {
  userInfo: UserInfo
}

export default function AppHeader({ userInfo }: Props) {
  const pathname = usePathname()

  const page = PAGE_META.find(p => pathname === p.match || pathname.startsWith(p.match + '/'))
    ?? { breadcrumb: 'Pages', title: 'Dashboard' }

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-white dark:bg-[var(--dark-card)] border-b border-slate-100 dark:border-[var(--dark-border)] shrink-0 z-20">
      {/* Left: breadcrumb + title */}
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none mb-0.5">
          {page.breadcrumb}
        </p>
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">
          {page.title}
        </h1>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 shrink-0 ml-4">
        {/* Search bar */}
        <div className="hidden lg:flex items-center gap-2 h-9 px-3.5 rounded-full bg-slate-100 dark:bg-[var(--dark-elevated)] text-sm text-slate-400 dark:text-slate-500 w-52 cursor-text">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="text-xs">Search</span>
        </div>

        {/* Notification bell */}
        <button
          className="relative h-9 w-9 rounded-full bg-slate-100 dark:bg-[var(--dark-elevated)] flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[var(--dark-hover)] transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-[var(--dark-card)]" />
        </button>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* User avatar/menu */}
        <UserMenu
          email={userInfo.email}
          displayName={userInfo.displayName}
          role={userInfo.role}
        />

        {/* Mobile sidebar toggle (placeholder) */}
        <button
          className="md:hidden h-9 w-9 rounded-full bg-slate-100 dark:bg-[var(--dark-elevated)] flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-[var(--dark-hover)] transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
