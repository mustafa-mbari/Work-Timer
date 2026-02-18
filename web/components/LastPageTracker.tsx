'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Pages that should NOT be recorded as the "last page" to return to
const EXCLUDED_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/auth',
]

export default function LastPageTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return
    if (EXCLUDED_PREFIXES.some(p => pathname.startsWith(p))) return
    try {
      localStorage.setItem('lastPage', pathname)
    } catch {
      // localStorage may be unavailable in some environments
    }
  }, [pathname])

  return null
}
