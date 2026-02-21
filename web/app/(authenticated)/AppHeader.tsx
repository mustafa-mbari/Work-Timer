'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/ThemeToggle'
import { UserMenu } from '@/components/UserMenu'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'

const PAGE_META: { match: string; title: string; description?: string }[] = [
  { match: '/dashboard', title: 'Dashboard', description: 'Main overview of your activity' },
  { match: '/analytics', title: 'Analytics', description: 'Detailed productivity reports' },
  { match: '/entries', title: 'Time Entries', description: 'Review and manage your logs' },
  { match: '/earnings', title: 'Earnings', description: 'Track project revenue' },
  { match: '/groups', title: 'Groups', description: 'Team collaboration' },
  { match: '/billing', title: 'Billing & Plans', description: 'Manage your subscription' },
  { match: '/settings', title: 'Settings', description: 'App and account preferences' },
  { match: '/admin/users', title: 'Users', description: 'Administration control' },
  { match: '/admin/stats', title: 'Statistics', description: 'System-wide performance' },
  { match: '/admin/domains', title: 'Domains', description: 'Whitelist management' },
  { match: '/admin/promos', title: 'Promo Codes', description: 'Discounts and offers' },
  { match: '/admin/subscriptions', title: 'Subscriptions', description: 'Active member list' },
  { match: '/admin/groups', title: 'Groups', description: 'Group management' },
  { match: '/admin', title: 'Admin Dashboard', description: 'Platform overview' },
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

  const page = PAGE_META.find(p => pathname === p.match || pathname.startsWith(p.match + '/'))
    ?? { title: 'Dashboard', description: 'Main overview of your activity' }

  return (
    <header className="sticky top-0 z-20 flex items-center h-14 bg-white dark:bg-[var(--dark-card)] border-b border-[var(--sidebar-border)] shrink-0 px-0">
      {/* Sidebar-width Logo Area */}
      <div
        className="flex items-center h-full px-1 transition-[width] duration-300 ease-in-out overflow-hidden"
        style={{ width: isMobile ? '0px' : 'var(--sidebar-width)' }}
      >
        {isMobile && (
          <div className="mr-2">
            <SidebarTrigger aria-label="Toggle sidebar" />
          </div>
        )}

        <Link href="/dashboard" className="shrink-0 flex items-center">
          <Image
            src="/logos/LogoText.png"
            alt="Work Timer"
            width={160}
            height={40}
            className="h-10 w-auto"
            priority
          />
        </Link>
      </div>

      {/* Vertical Divider / Line matching sidebar border */}
      <div className="hidden sm:block h-full w-px bg-[var(--sidebar-border)]" />

      {/* Main header content (Page info + Actions) */}
      <div className="flex-1 flex items-center justify-between px-6 min-w-0">
        <div className="flex items-baseline gap-3 min-w-0">
          <h1 className="text-base font-bold text-stone-800 dark:text-stone-100 leading-tight truncate shrink-0">
            {page.title}
          </h1>
          {page.description && (
            <p className="text-[11px] font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wider truncate">
              {page.description}
            </p>
          )}
        </div>

        {/* Right: actions (Opposite order) */}
        <div className="flex items-center gap-6 shrink-0">
          {/* Language selector */}
          <div className="hidden sm:block">
            <LanguageSwitcher compact />
          </div>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* User avatar/menu */}
          <UserMenu
            email={userInfo.email}
            displayName={userInfo.displayName}
            role={userInfo.role}
          />
        </div>
      </div>
    </header>
  )
}
