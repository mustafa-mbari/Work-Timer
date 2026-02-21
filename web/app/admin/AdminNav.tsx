'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, UsersRound, BarChart3, Globe, Ticket, CreditCard } from 'lucide-react'

export function AdminNav() {
  const pathname = usePathname()
  const t = useTranslations('admin.nav')

  const NAV_ITEMS = [
    { href: '/admin',               label: t('overview'),      icon: LayoutDashboard, exact: true },
    { href: '/admin/users',         label: t('users'),         icon: Users },
    { href: '/admin/stats',         label: t('statistics'),    icon: BarChart3 },
    { href: '/admin/domains',       label: t('domains'),       icon: Globe },
    { href: '/admin/promos',        label: t('promoCodes'),    icon: Ticket },
    { href: '/admin/subscriptions', label: t('subscriptions'), icon: CreditCard },
    { href: '/admin/groups',        label: 'Groups',          icon: UsersRound },
  ]

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
