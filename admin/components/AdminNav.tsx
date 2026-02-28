'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, UsersRound, BarChart3, Globe, Ticket, CreditCard } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/',               label: 'Overview',       icon: LayoutDashboard, exact: true },
  { href: '/users',          label: 'Users',          icon: Users },
  { href: '/stats',          label: 'Statistics',     icon: BarChart3 },
  { href: '/domains',        label: 'Domains',        icon: Globe },
  { href: '/promos',         label: 'Promo Codes',    icon: Ticket },
  { href: '/subscriptions',  label: 'Subscriptions',  icon: CreditCard },
  { href: '/groups',         label: 'Groups',         icon: UsersRound },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-1 bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] rounded-2xl shadow-sm px-2 py-1.5 overflow-x-auto mb-6">
      {NAV_ITEMS.map(item => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + '/')
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-all',
              isActive
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)]'
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}
