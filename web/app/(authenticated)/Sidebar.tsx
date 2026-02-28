'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard,
  BarChart2,
  Clock,
  DollarSign,
  Users,
  CreditCard,
  Settings2,
  Zap,
  PanelLeft,
  Check,
  type LucideIcon,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSidebarLock, type SidebarMode } from '@/hooks/use-sidebar-lock'
import { cn } from '@/lib/utils'

interface UserInfo {
  email: string
  displayName: string | null
  role: 'user' | 'admin'
}

interface Props {
  isPremium?: boolean
  isAllIn?: boolean
  userInfo?: UserInfo
}

const SIDEBAR_MODES: { value: SidebarMode; label: string }[] = [
  { value: 'expanded', label: 'Expanded' },
  { value: 'collapsed', label: 'Collapsed' },
  { value: 'hover', label: 'Expand on hover' },
]

// NavItem: no group-data-[collapsible=icon] classes — icon never moves,
// text is hidden via overflow-hidden on the link + opacity transition.
// mx-2 makes the link (48-16)=32px wide in collapsed mode, perfectly
// centered in the 48px sidebar strip.
function NavItem({
  href,
  label,
  icon: Icon,
  isActive,
  open,
}: {
  href: string
  label: string
  icon: LucideIcon
  isActive: boolean
  open: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className="group/nav flex items-center h-10 rounded-lg mx-2 overflow-hidden transition-colors hover:bg-[#ebebeb] dark:hover:bg-[var(--dark-hover)]"
    >
      {/* Icon container: ALWAYS 32×32 — carries the active background.
          Centered in the 48px sidebar strip regardless of sidebar CSS width. */}
      <span
        className={cn(
          'w-8 h-8 flex items-center justify-center shrink-0 rounded-lg transition-colors',
          isActive
            ? 'bg-[#e8e6ff] dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
            : 'text-stone-500 dark:text-stone-400 group-hover/nav:text-stone-800 dark:group-hover/nav:text-stone-100',
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      {/* Text: max-width transition hides it from layout when collapsed,
          opacity fades it visually. Double mechanism for reliability. */}
      <span
        className={cn(
          'text-[13px] whitespace-nowrap overflow-hidden',
          isActive
            ? 'text-indigo-600 dark:text-indigo-400'
            : 'text-stone-500 dark:text-stone-400 group-hover/nav:text-stone-800 dark:group-hover/nav:text-stone-100',
        )}
        style={{
          maxWidth: open ? '200px' : '0px',
          opacity: open ? 1 : 0,
          marginLeft: open ? '8px' : '0px',
          transition: 'max-width 300ms ease-in-out, opacity 250ms ease-in-out 50ms, margin-left 300ms ease-in-out',
        }}
      >
        {label}
      </span>
    </Link>
  )
}

function SidebarFooterContent({
  isPremium,
}: {
  isPremium?: boolean
}) {
  const { state, setOpen } = useSidebar()
  const { mode, setMode } = useSidebarLock()
  const isCollapsed = state === 'collapsed'
  const ts = useTranslations('common.sidebar')
  function handleSetMode(next: SidebarMode) {
    setMode(next)
    if (next === 'expanded') setOpen(true)
    if (next === 'collapsed') setOpen(false)
  }

  return (
    <SidebarFooter className="gap-0 pb-2 pt-0">
      {/* Upgrade card — hidden when collapsed */}
      {!isPremium && !isCollapsed && (
        <>
          <div className="px-3 pb-3">
            <div
              className="relative rounded-xl overflow-hidden p-4 text-white"
              style={{ background: 'linear-gradient(135deg, #868CFF 0%, #4318FF 100%)' }}
            >
              <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-white/10 pointer-events-none" />
              <div className="absolute bottom-1 -left-3 h-14 w-14 rounded-full bg-white/10 pointer-events-none" />
              <div className="relative">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center mb-2.5">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <p className="font-bold text-sm leading-tight mb-0.5">{ts('upgradeTitle')}</p>
                <p className="text-xs text-indigo-100 mb-3">{ts('upgradeSubtitle')}</p>
                <Link
                  href="/billing"
                  className="block text-center bg-white text-indigo-700 font-semibold text-xs rounded-full py-1.5 px-4 hover:bg-indigo-50 transition-colors"
                >
                  Upgrade Now
                </Link>
              </div>
            </div>
          </div>
          <SidebarSeparator className="mb-2" />
        </>
      )}

      {/* Sidebar control */}
      <div className={`px-2 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {isCollapsed ? (
              <button
                className="h-8 w-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-[var(--dark-hover)] transition-colors"
                aria-label="Sidebar control"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
            ) : (
              <button
                className="w-full flex items-center gap-2 px-3 h-9 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-[var(--dark-hover)] transition-colors text-xs"
                aria-label="Sidebar control"
              >
                <PanelLeft className="h-4 w-4 shrink-0" />
                <span>Sidebar control</span>
              </button>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isCollapsed ? 'right' : 'top'}
            align={isCollapsed ? 'end' : 'start'}
            className="w-48"
          >
            <DropdownMenuLabel className="text-xs text-stone-400 font-medium">
              Sidebar control
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SIDEBAR_MODES.map(({ value, label }) => (
              <DropdownMenuItem
                key={value}
                onClick={() => handleSetMode(value)}
                className="flex items-center justify-between"
              >
                <span>{label}</span>
                {mode === value && <Check className="h-3.5 w-3.5 text-[#625fff]" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </SidebarFooter>
  )
}

export default function AppSidebar({ isPremium, isAllIn, userInfo }: Props) {
  const pathname = usePathname()
  const tn = useTranslations('common.nav')
  const { setOpen, isMobile, open } = useSidebar()
  const { mode } = useSidebarLock()

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  const handleMouseEnter = () => {
    if (!isMobile && mode === 'hover') setOpen(true)
  }
  const handleMouseLeave = () => {
    if (!isMobile && mode === 'hover') setOpen(false)
  }

  const NAV_MAIN = [
    { href: '/dashboard', label: tn('dashboard'), icon: LayoutDashboard },
    { href: '/entries', label: tn('entries'), icon: Clock },
    { href: '/analytics', label: tn('analytics'), icon: BarChart2 },
    { href: '/earnings', label: 'Earnings', icon: DollarSign },
    ...(isAllIn ? [{ href: '/groups', label: 'Groups', icon: Users }] : []),
  ]

  const NAV_ACCOUNT = [
    { href: '/billing', label: tn('billing'), icon: CreditCard },
    { href: '/settings', label: tn('settings'), icon: Settings2 },
  ]

  return (
    <Sidebar
      collapsible="icon"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="pt-14"
    >
      <SidebarContent>
        {/* Main nav */}
        <div className="flex flex-col gap-1 pt-3">
          {NAV_MAIN.map(({ href, label, icon }) => (
            <NavItem
              key={href}
              href={href}
              label={label}
              icon={icon}
              isActive={isActive(href)}
              open={open}
            />
          ))}
        </div>

        <SidebarSeparator className="my-3" />

        {/* Account nav */}
        <div className="flex flex-col gap-1">
          {NAV_ACCOUNT.map(({ href, label, icon }) => (
            <NavItem
              key={href}
              href={href}
              label={label}
              icon={icon}
              isActive={isActive(href)}
              open={open}
            />
          ))}
        </div>


      </SidebarContent>

      <SidebarFooterContent isPremium={isPremium} />
    </Sidebar>
  )
}
