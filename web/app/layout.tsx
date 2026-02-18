import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import './globals.css'
import Navbar from '@/components/Navbar'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'
import type { Theme } from '@/lib/theme'

// eslint-disable-next-line react-refresh/only-export-components
export const metadata: Metadata = {
  title: 'Work Timer — Time Tracking for Focused Work',
  description: 'Track your work time with a privacy-first Chrome extension. Free, offline, and blazing fast.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read theme cookie on the server so ThemeProvider initial state matches hydration
  const cookieStore = await cookies()
  const themeCookie = cookieStore.get('theme')?.value
  const initialTheme: Theme = (themeCookie === 'light' || themeCookie === 'dark' || themeCookie === 'system')
    ? themeCookie
    : 'system'

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline script to apply theme class before first paint (avoids flash) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=document.cookie.match(/(?:^|; )theme=([^;]*)/);var t=m?m[1]:'system';var r=t;if(t==='system'){r=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}document.documentElement.classList.add(r)}catch(e){}})()`,
          }}
        />
      </head>
      <body className="bg-white text-stone-900 min-h-screen flex flex-col dark:bg-[var(--dark)] dark:text-stone-200">
        <ThemeProvider initialTheme={initialTheme}>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <footer className="border-t border-stone-200 py-8 mt-16 dark:border-[var(--dark-border)]">
            <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-stone-500 dark:text-stone-400">
              {/* suppressHydrationWarning: year may differ at midnight across timezones */}
              <span suppressHydrationWarning>&copy; {new Date().getFullYear()} Work Timer. All rights reserved.</span>
              <div className="flex gap-6">
                <a href="/privacy" className="hover:text-stone-700 dark:hover:text-stone-300 transition-colors">Privacy</a>
                <a href="/terms" className="hover:text-stone-700 dark:hover:text-stone-300 transition-colors">Terms</a>
              </div>
            </div>
          </footer>
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
