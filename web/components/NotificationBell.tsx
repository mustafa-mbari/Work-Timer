'use client'

import { Bell, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNotifications, type NotificationType } from '@/contexts/NotificationContext'

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const DOT_COLORS: Record<NotificationType, string> = {
  warning: 'bg-amber-500',
  error: 'bg-rose-500',
  info: 'bg-indigo-500',
}

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications()

  return (
    <DropdownMenu onOpenChange={open => { if (open) markAllRead() }}>
      <DropdownMenuTrigger asChild>
        <button
          className="p-1.5 rounded-md relative text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-[var(--dark-hover)] transition-colors"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 border-2 border-white dark:border-[var(--dark-card)]" />
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0 text-sm">Notifications</DropdownMenuLabel>
          {notifications.length > 0 && (
            <button
              onClick={e => { e.preventDefault(); clearAll() }}
              className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              Clear all
            </button>
          )}
        </div>

        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-stone-400 dark:text-stone-500">
            No notifications
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto">
            {notifications.map(n => (
              <button
                key={n.id}
                onClick={e => { e.preventDefault(); markRead(n.id) }}
                className={`w-full text-left flex items-start gap-3 px-3 py-2.5 hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)] transition-colors ${
                  !n.read ? 'bg-stone-50/50 dark:bg-[var(--dark-elevated)]/30' : ''
                }`}
              >
                <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${DOT_COLORS[n.type]}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-tight ${!n.read ? 'font-medium text-stone-900 dark:text-stone-100' : 'text-stone-600 dark:text-stone-400'}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-2">
                    {n.message}
                  </p>
                  <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-1">
                    {timeAgo(n.timestamp)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
