'use client'

import { Eye, EyeOff, Shield, FileBarChart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface MemberSummary {
  user_id: string
  display_name: string
  email: string
  role: string
  sharing_enabled: boolean
  current_week_hours: number
  last_week_hours: number
  current_month_hours: number
  last_month_hours: number
  today_hours?: number
}

interface Props {
  member: MemberSummary
  period: 'today' | 'week' | 'month'
  onViewDetail: (userId: string) => void
}

function formatHours(h: number) {
  return h < 0.1 ? '0h' : h < 10 ? `${h.toFixed(1)}h` : `${Math.round(h)}h`
}

const PERIOD_LABELS: Record<string, string> = {
  today: 'today',
  week: 'this week',
  month: 'this month',
}

export default function MemberCard({ member, period, onViewDetail }: Props) {
  const hours = period === 'today'
    ? (member.today_hours ?? 0)
    : period === 'week'
      ? member.current_week_hours
      : member.current_month_hours

  const displayName = member.display_name || member.email
  const initials = displayName[0]?.toUpperCase() ?? '?'

  return (
    <div className={`rounded-2xl bg-white dark:bg-[var(--dark-card)] border shadow-sm transition-all ${
      member.sharing_enabled
        ? 'border-stone-100 dark:border-[var(--dark-border)] hover:border-stone-200 dark:hover:border-stone-600'
        : 'border-stone-100 dark:border-[var(--dark-border)] opacity-60'
    }`}>
      <div className="p-4">
        {/* Top: avatar + name + role */}
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400 flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate">
                {displayName}
              </p>
              {member.role === 'admin' && (
                <Shield className="h-3 w-3 text-amber-500 flex-shrink-0" />
              )}
            </div>
            {member.display_name && (
              <p className="text-xs text-stone-400 truncate">{member.email}</p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {member.sharing_enabled ? (
              <Eye className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-stone-300 dark:text-stone-600" />
            )}
          </div>
        </div>

        {/* Hours */}
        <div className="mb-4">
          {member.sharing_enabled ? (
            <>
              <p className="text-2xl font-bold text-stone-800 dark:text-stone-100 tabular-nums">
                {formatHours(hours)}
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-500">{PERIOD_LABELS[period]}</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-stone-300 dark:text-stone-600">--</p>
              <p className="text-xs text-stone-400 dark:text-stone-500">Private</p>
            </>
          )}
        </div>

        {/* Action */}
        {member.sharing_enabled && (
          <Button
            onClick={() => onViewDetail(member.user_id)}
            variant="outline"
            size="sm"
            className="w-full rounded-xl gap-1.5 text-xs"
          >
            <FileBarChart className="h-3.5 w-3.5" />
            View Report
          </Button>
        )}
      </div>
    </div>
  )
}
