import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'
import type { Theme } from '@/lib/theme'

// eslint-disable-next-line react-refresh/only-export-components
export const metadata: Metadata = {
  title: 'Work Timer — Time Tracking for Focused Work',
  description: 'Track your work time with a privacy-first Chrome extension. Free, offline, and blazing fast.',
  icons: {
    icon: '/favicon.png',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const themeCookie = cookieStore.get('theme')?.value
  const initialTheme: Theme = (themeCookie === 'light' || themeCookie === 'dark' || themeCookie === 'system')
    ? themeCookie
    : 'system'

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=document.cookie.match(/(?:^|; )theme=([^;]*)/);var t=m?m[1]:'system';var r=t;if(t==='system'){r=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}document.documentElement.classList.add(r)}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen dark:bg-[var(--dark)] dark:text-stone-200">
        <ThemeProvider initialTheme={initialTheme}>
          {children}
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
