'use client'

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'

export type NotificationType = 'warning' | 'error' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: number
  read: boolean
}

interface NotificationContextValue {
  notifications: Notification[]
  unreadCount: number
  addNotification: (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markRead: (id: string) => void
  markAllRead: () => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markRead: () => {},
  markAllRead: () => {},
  clearAll: () => {},
})

const MAX_NOTIFICATIONS = 50

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications],
  )

  const addNotification = useCallback(
    (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
      setNotifications(prev => {
        // Deduplicate: skip if unread notification with same title exists
        if (prev.some(existing => !existing.read && existing.title === n.title)) {
          return prev
        }
        const next: Notification[] = [
          { ...n, id: crypto.randomUUID(), timestamp: Date.now(), read: false },
          ...prev,
        ]
        // Cap at MAX_NOTIFICATIONS (drop oldest)
        return next.slice(0, MAX_NOTIFICATIONS)
      })
    },
    [],
  )

  const markRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n)),
    )
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const value = useMemo<NotificationContextValue>(
    () => ({ notifications, unreadCount, addNotification, markRead, markAllRead, clearAll }),
    [notifications, unreadCount, addNotification, markRead, markAllRead, clearAll],
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}
