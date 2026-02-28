'use client'

import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { LogOut, Shield, Sun, Moon } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { Button } from '@/components/ui/button'

interface AdminHeaderProps {
  email: string
  displayName: string | null
}

export function AdminHeader({ email, displayName }: AdminHeaderProps) {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()

  async function handleSignOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] shrink-0">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-indigo-600">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold text-sm text-stone-900 dark:text-stone-100">
          Work Timer Admin
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-stone-500 dark:text-stone-400 hidden sm:block">
          {displayName || email}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="h-8 w-8 p-0"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="h-8 gap-1.5 text-stone-500 hover:text-rose-600"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-xs hidden sm:block">Sign out</span>
        </Button>
      </div>
    </header>
  )
}
