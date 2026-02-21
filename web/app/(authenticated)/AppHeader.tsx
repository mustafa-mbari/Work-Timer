'use client'

import { usePathname } from 'next/navigation'
import { Bell, Search } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { UserMenu } from '@/components/UserMenu'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { useSidebarLock } from '@/hooks/use-sidebar-lock'

const PAGE_META: { match: string; breadcrumb: string; title: string }[] = [
  { match: '/dashboard',           breadcrumb: 'Pages / Dashboard',           title: 'Main Dashboard' },
  { match: '/analytics',           breadcrumb: 'Pages / Analytics',           title: 'Analytics' },
  { match: '/entries',             breadcrumb: 'Pages / Entries',             title: 'Time Entries' },
  { match: '/billing',             breadcrumb: 'Pages / Billing',             title: 'Billing & Plans' },
  { match: '/settings',            breadcrumb: 'Pages / Settings',            title: 'Settings' },
  { match: '/admin/users',         breadcrumb: 'Admin / Users',               title: 'Users' },
  { match: '/admin/stats',         breadcrumb: 'Admin / Statistics',          title: 'Statistics' },
  { match: '/admin/domains',       breadcrumb: 'Admin / Domains',             title: 'Domains' },
  { match: '/admin/promos',        breadcrumb: 'Admin / Promo Codes',         title: 'Promo Codes' },
  { match: '/admin/subscriptions', breadcrumb: 'Admin / Subscriptions',       title: 'Subscriptions' },
  { match: '/admin',               breadcrumb: 'Admin / Overview',            title: 'Admin Dashboard' },
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
  const { isMobile } = useSidebar()
  const { locked } = useSidebarLock()

  const page = PAGE_META.find(p => pathname === p.match || pathname.startsWith(p.match + '/'))
    ?? { breadcrumb: 'Pages', title: 'Dashboard' }

  // On desktop, hover handles open/close — only show trigger on mobile
  const showTrigger = isMobile

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-4 bg-white dark:bg-[var(--dark-card)] border-b border-stone-100 dark:border-[var(--dark-border)] shrink-0">
      {/* Left: sidebar toggle + breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        {showTrigger && <SidebarTrigger aria-label="Toggle sidebar" />}
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wider leading-none mb-0.5">
            {page.breadcrumb}
          </p>
          <h1 className="text-lg font-bold text-stone-800 dark:text-stone-100 leading-tight truncate">
            {page.title}
          </h1>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 shrink-0 ml-4">
        {/* Search bar */}
        <div className="hidden lg:flex items-center gap-2 h-9 px-3.5 rounded-full bg-stone-100 dark:bg-[var(--dark-elevated)] text-sm text-stone-400 dark:text-stone-500 w-52 cursor-text">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="text-xs">Search</span>
        </div>

        {/* Notification bell */}
        <button
          className="relative h-9 w-9 rounded-full bg-stone-100 dark:bg-[var(--dark-elevated)] flex items-center justify-center text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-[var(--dark-hover)] transition-colors"
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
      </div>
    </header>
  )
}
