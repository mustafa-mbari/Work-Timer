import { getTranslations } from 'next-intl/server'
import Navbar from '@/components/Navbar'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('common.footer')

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[var(--dark)]">
      <Navbar />
      <main className="flex-1 text-stone-900 dark:text-stone-200">
        {children}
      </main>
      <footer className="border-t border-stone-200 py-8 mt-16 dark:border-[var(--dark-border)]">
        <div className="mx-auto w-full max-w-[1200px] px-8 flex items-center justify-between gap-4 text-sm text-stone-500 dark:text-stone-400">
          <span suppressHydrationWarning>
            &copy; {new Date().getFullYear()} {t('copyright')}
          </span>
          <div className="flex gap-6">
            <a href="/privacy" className="hover:text-stone-700 dark:hover:text-stone-300 transition-colors">
              {t('privacy')}
            </a>
            <a href="/terms" className="hover:text-stone-700 dark:hover:text-stone-300 transition-colors">
              {t('terms')}
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
