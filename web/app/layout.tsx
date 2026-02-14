import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'Work Timer — Time Tracking for Focused Work',
  description: 'Track your work time with a privacy-first Chrome extension. Free, offline, and blazing fast.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-stone-900 min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <footer className="border-t border-stone-200 py-8 mt-16">
          <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-stone-500">
            <span>© {new Date().getFullYear()} Work Timer. All rights reserved.</span>
            <div className="flex gap-6">
              <a href="/privacy" className="hover:text-stone-700 transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-stone-700 transition-colors">Terms</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
