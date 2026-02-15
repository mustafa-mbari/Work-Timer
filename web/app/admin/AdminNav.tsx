'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, BarChart3, Globe, Ticket, CreditCard } from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/stats', label: 'Statistics', icon: BarChart3 },
  { href: '/admin/domains', label: 'Domains', icon: Globe },
  { href: '/admin/promos', label: 'Promo Codes', icon: Ticket },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 mb-8 border-b border-stone-200 dark:border-[var(--dark-border)] overflow-x-auto">
      {navItems.map(item => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + '/')
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
              isActive
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-stone-500 hover:text-stone-900 hover:border-stone-300 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:border-stone-600'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
