'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BarChart2, Clock, CreditCard, Settings2, Zap, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/analytics', label: 'Analytics',  icon: BarChart2 },
  { href: '/entries',   label: 'Entries',    icon: Clock },
  { href: '/billing',   label: 'Billing',    icon: CreditCard },
  { href: '/settings',  label: 'Settings',   icon: Settings2 },
]

interface Props {
  isAdmin?: boolean
  isPremium?: boolean
}

export default function Sidebar({ isAdmin, isPremium }: Props) {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 bg-white dark:bg-[var(--dark-card)] border-r border-slate-100 dark:border-[var(--dark-border)] h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center px-5 h-16 border-b border-slate-100 dark:border-[var(--dark-border)] shrink-0">
        <Link href="/">
          <Image
            src="/logos/WT_logoWithText.png"
            alt="Work Timer"
            width={130}
            height={36}
            className="h-8 w-auto"
            priority
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-5 space-y-0.5 overflow-y-auto">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
                active
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/40'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[var(--dark-hover)] hover:text-slate-800 dark:hover:text-slate-100'
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {label}
            </Link>
          )
        })}

        {/* Admin link — only for admin users */}
        {isAdmin && (
          <>
            <div className="mx-2 my-2 h-px bg-slate-100 dark:bg-[var(--dark-border)]" />
            <Link
              href="/admin"
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
                pathname === '/admin' || pathname.startsWith('/admin/')
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/40'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[var(--dark-hover)] hover:text-slate-800 dark:hover:text-slate-100'
              )}
            >
              <Shield className="h-[18px] w-[18px] shrink-0" />
              Admin Panel
            </Link>
          </>
        )}
      </nav>

      {/* Upgrade to PRO card — only shown for free users */}
      {!isPremium && <div className="px-4 pb-6 shrink-0">
        <div className="relative rounded-2xl overflow-hidden p-5 text-white" style={{ background: 'linear-gradient(135deg, #868CFF 0%, #4318FF 100%)' }}>
          <div className="absolute -top-5 -right-5 h-24 w-24 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute bottom-2 -left-4 h-16 w-16 rounded-full bg-white/10 pointer-events-none" />
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center mb-3">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <p className="font-bold text-sm leading-tight mb-0.5">Upgrade to PRO</p>
            <p className="text-xs text-indigo-100 mb-4">to get access to all features!</p>
            <Link
              href="/billing"
              className="block text-center bg-white text-indigo-700 font-semibold text-xs rounded-full py-2 px-4 hover:bg-indigo-50 transition-colors"
            >
              Upgrade Now
            </Link>
          </div>
        </div>
      </div>}
    </aside>
  )
}
