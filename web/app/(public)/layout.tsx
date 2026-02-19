import Navbar from '@/components/Navbar'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[var(--dark)]">
      <Navbar />
      <main className="flex-1 text-stone-900 dark:text-stone-200">
        {children}
      </main>
      <footer className="border-t border-stone-200 py-8 mt-16 dark:border-[var(--dark-border)]">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-stone-500 dark:text-stone-400">
          <span suppressHydrationWarning>&copy; {new Date().getFullYear()} Work Timer. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="/privacy" className="hover:text-stone-700 dark:hover:text-stone-300 transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-stone-700 dark:hover:text-stone-300 transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
