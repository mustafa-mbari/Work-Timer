'use client'

import * as React from 'react'

const COOKIE_NAME = 'sidebar_locked'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

interface SidebarLockContextValue {
  locked: boolean
  toggleLock: () => void
}

const SidebarLockContext = React.createContext<SidebarLockContextValue>({
  locked: false,
  toggleLock: () => {},
})

export function SidebarLockProvider({
  children,
  defaultLocked = false,
}: {
  children: React.ReactNode
  defaultLocked?: boolean
}) {
  const [locked, setLocked] = React.useState(defaultLocked)

  const toggleLock = React.useCallback(() => {
    setLocked((prev) => {
      const next = !prev
      document.cookie = `${COOKIE_NAME}=${next}; path=/; max-age=${COOKIE_MAX_AGE}`
      return next
    })
  }, [])

  return (
    <SidebarLockContext.Provider value={{ locked, toggleLock }}>
      {children}
    </SidebarLockContext.Provider>
  )
}

export function useSidebarLock() {
  return React.useContext(SidebarLockContext)
}
