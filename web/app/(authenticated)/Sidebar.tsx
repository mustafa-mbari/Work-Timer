'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard,
  BarChart2,
  Clock,
  CreditCard,
  Settings2,
  Zap,
  Shield,
  Pin,
  PinOff,
  MoreHorizontal,
  LogOut,
  Settings,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSidebarLock } from '@/hooks/use-sidebar-lock'
import { createClient } from '@/lib/supabase/client'

interface UserInfo {
  email: string
  displayName: string | null
  role: 'user' | 'admin'
}

interface Props {
  isAdmin?: boolean
  isPremium?: boolean
  userInfo?: UserInfo
}

function SidebarFooterContent({
  isPremium,
  userInfo,
}: {
  isPremium?: boolean
  userInfo?: UserInfo
}) {
  const { state } = useSidebar()
  const { locked, toggleLock } = useSidebarLock()
  const isCollapsed = state === 'collapsed'
  const ts = useTranslations('common.sidebar')
  const router = useRouter()
  const supabase = createClient()

  const initials = userInfo
    ? ((userInfo.displayName || userInfo.email)
        .split(/[\s@]/)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase() || '')
        .join(''))
    : '?'

  const displayLabel = userInfo?.displayName || userInfo?.email || ''

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <SidebarFooter className="gap-0 pb-3 pt-0">
      {/* Upgrade to PRO card — hidden when collapsed */}
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
          <SidebarSeparator className="mb-3" />
        </>
      )}

      {/* User profile */}
      {userInfo && (
        <div className="px-2">
          {isCollapsed ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="w-full flex justify-center py-1 rounded-lg hover:bg-stone-100 dark:hover:bg-[var(--dark-hover)] transition-colors"
                  aria-label="User menu"
                >
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-48">
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-rose-600 dark:text-rose-400 focus:text-rose-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-stone-50 dark:bg-[var(--dark-elevated)] border border-stone-100 dark:border-[var(--dark-border)]">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="text-sm font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate leading-tight">
                  {displayLabel}
                </p>
                {userInfo.displayName && (
                  <p className="text-xs text-stone-400 dark:text-stone-500 truncate leading-tight mt-0.5">
                    {userInfo.email}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={toggleLock}
                  className="h-7 w-7 flex items-center justify-center rounded-lg text-stone-300 hover:text-stone-500 dark:hover:text-stone-300 hover:bg-stone-200 dark:hover:bg-[var(--dark-hover)] transition-colors"
                  aria-label={locked ? 'Unpin sidebar' : 'Pin sidebar open'}
                  title={locked ? 'Unpin sidebar' : 'Pin sidebar open'}
                >
                  {locked ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="h-7 w-7 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-[var(--dark-hover)] transition-colors"
                      aria-label="User options"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="end" className="w-48">
                    <DropdownMenuItem onClick={() => router.push('/settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="text-rose-600 dark:text-rose-400 focus:text-rose-600"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
        </div>
      )}
    </SidebarFooter>
  )
}

export default function AppSidebar({ isAdmin, isPremium, userInfo }: Props) {
  const pathname = usePathname()
  const tn = useTranslations('common.nav')
  const { setOpen, isMobile } = useSidebar()
  const { locked } = useSidebarLock()

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  // Hover-to-expand: only on desktop and when not pinned open
  const handleMouseEnter = () => {
    if (!isMobile && !locked) setOpen(true)
  }
  const handleMouseLeave = () => {
    if (!isMobile && !locked) setOpen(false)
  }

  const NAV_MAIN = [
    { href: '/dashboard', label: tn('dashboard'), icon: LayoutDashboard },
    { href: '/analytics', label: tn('analytics'), icon: BarChart2 },
    { href: '/entries', label: tn('entries'), icon: Clock },
  ]

  const NAV_ACCOUNT = [
    { href: '/billing', label: tn('billing'), icon: CreditCard },
    { href: '/settings', label: tn('settings'), icon: Settings2 },
  ]

  const navItemClass =
    'h-10 rounded-lg px-3 text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-100 hover:bg-[#ebebeb] dark:hover:bg-[var(--dark-hover)]'

  return (
    <Sidebar
      collapsible="icon"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Logo */}
      <SidebarHeader className="h-14 border-b border-sidebar-border flex flex-row items-center px-3 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
        {/* Full logo — shown when expanded */}
        <Link href="/" className="flex items-center group-data-[collapsible=icon]:hidden">
          <Image
            src="/logos/WT_logoWithText.png"
            alt="Work Timer"
            width={260}
            height={64}
            className="h-8 w-auto"
            priority
          />
        </Link>
        {/* Icon-only logo — shown when collapsed */}
        <Link href="/" className="hidden group-data-[collapsible=icon]:flex items-center justify-center">
          <Image
            src="/logos/WT_justLogo.png"
            alt="Work Timer"
            width={32}
            height={32}
            className="h-7 w-7"
            priority
          />
        </Link>
      </SidebarHeader>

      <SidebarContent className="py-3">
        {/* Main nav */}
        <SidebarGroup className="px-3 py-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {NAV_MAIN.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(href)}
                    tooltip={label}
                    aria-current={isActive(href) ? 'page' : undefined}
                    className={navItemClass}
                  >
                    <Link href={href}>
                      <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
                      <span className="text-[13px]">{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-3" />

        {/* Account nav */}
        <SidebarGroup className="px-3 py-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {NAV_ACCOUNT.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(href)}
                    tooltip={label}
                    aria-current={isActive(href) ? 'page' : undefined}
                    className={navItemClass}
                  >
                    <Link href={href}>
                      <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
                      <span className="text-[13px]">{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin nav */}
        {isAdmin && (
          <>
            <SidebarSeparator className="my-3" />
            <SidebarGroup className="px-3 py-0">
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive('/admin')}
                      tooltip="Admin Panel"
                      aria-current={isActive('/admin') ? 'page' : undefined}
                      className={navItemClass}
                    >
                      <Link href="/admin">
                        <Shield aria-hidden="true" className="h-4 w-4 shrink-0" />
                        <span className="text-[13px]">{tn('adminPanel')}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooterContent isPremium={isPremium} userInfo={userInfo} />
    </Sidebar>
  )
}
