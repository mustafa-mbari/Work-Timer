import Link from 'next/link'
import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { NavLink } from '@/components/NavLink'
import { UserMenu } from '@/components/UserMenu'
import { MobileMenu } from '@/components/MobileMenu'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ExtensionStatusButton } from '@/components/ExtensionStatusButton'
import { Button } from '@/components/ui/button'

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const t = await getTranslations('common.nav')

  // Fetch profile for display name and role if logged in
  let profile: { display_name: string | null; role: 'user' | 'admin' } | null = null
  if (user) {
    const { data } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('profiles') as any)
      .select('display_name, role')
      .eq('id', user.id)
      .single()
    if (data) {
      profile = { display_name: data.display_name, role: data.role }
    }
  }

  const userInfo = user && profile ? {
    email: user.email || '',
    displayName: profile.display_name,
    role: profile.role,
  } : null

  const navLinkClass = 'px-3 py-1.5 text-sm rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-[var(--dark-hover)]'
  const activeLinkClass = '!text-indigo-600 !bg-indigo-50 font-medium dark:!text-indigo-400 dark:!bg-indigo-900/20'

  return (
    <nav className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40 dark:bg-[var(--dark)]/80 dark:border-[var(--dark-border)]">
      <div className="mx-auto w-full max-w-[1200px] px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image
            src="/logos/WT_logoWithText.png"
            alt="Work Timer"
            width={140}
            height={40}
            className="h-8 w-auto"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <div className="flex items-center gap-1">
          {userInfo ? (
            <>
              <NavLink href="/dashboard" className={navLinkClass} activeClassName={activeLinkClass}>
                {t('dashboard')}
              </NavLink>
              <NavLink href="/analytics" className={navLinkClass} activeClassName={activeLinkClass}>
                {t('analytics')}
              </NavLink>
              <NavLink href="/entries" className={navLinkClass} activeClassName={activeLinkClass}>
                {t('entries')}
              </NavLink>
              <NavLink href="/billing" className={navLinkClass} activeClassName={activeLinkClass}>
                {t('billing')}
              </NavLink>
              <NavLink href="/settings" className={navLinkClass} activeClassName={activeLinkClass}>
                {t('settings')}
              </NavLink>
              <div className="w-px h-5 bg-stone-200 mx-2 dark:bg-[var(--dark-border)]" />
              <LanguageSwitcher />
              <ExtensionStatusButton />
              <ThemeToggle />
              <div className="ml-1">
                <UserMenu
                  email={userInfo.email}
                  displayName={userInfo.displayName}
                  role={userInfo.role}
                />
              </div>
            </>
          ) : (
            <>
              <LanguageSwitcher />
              <ThemeToggle />
              <div className="w-px h-5 bg-stone-200 mx-2 dark:bg-[var(--dark-border)]" />
              <Link
                href="/login"
                className="px-3 py-1.5 text-sm text-stone-600 hover:text-stone-900 transition-colors dark:text-stone-400 dark:hover:text-stone-100"
              >
                {t('signIn')}
              </Link>
              <Button asChild size="sm">
                <Link href="/register">{t('getStarted')}</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile menu trigger */}
        <MobileMenu user={userInfo} />
      </div>
    </nav>
  )
}
