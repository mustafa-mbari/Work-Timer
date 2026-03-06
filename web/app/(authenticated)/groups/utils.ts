import type { GroupShareListItem } from '@/lib/repositories/groupShares'

// ─── Shared Types ──────────────────────────────────────────────────────────────

export interface ProjectItem { id: string; name: string; color: string }
export interface TagItem { id: string; name: string; color: string }

export interface MemberInfo {
  user_id: string
  role: string
  email: string
  display_name: string | null
}

export interface OwnStats {
  today_hours: number
  week_hours: number
  month_hours: number
}

// ─── Formatting Utilities ──────────────────────────────────────────────────────

export function formatHours(h: number): string {
  if (h < 0.1) return '0h'
  if (h < 10) return `${h.toFixed(1)}h`
  return `${Math.round(h)}h`
}

export function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}m`
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatIsoDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatPeriod(share: Pick<GroupShareListItem, 'date_from' | 'date_to' | 'period_type'>): string {
  const from = new Date(share.date_from + 'T00:00:00')
  const to = new Date(share.date_to + 'T00:00:00')
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (share.period_type === 'day') return from.toLocaleDateString(undefined, opts)
  return `${from.toLocaleDateString(undefined, opts)} – ${to.toLocaleDateString(undefined, opts)}`
}

export function periodLabel(type: string): string {
  return type === 'day' ? 'Daily' : type === 'week' ? 'Weekly' : 'Monthly'
}

export function getInitials(name: string | null, email: string): string {
  if (name) return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

// ─── Quick Date Range Utilities ───────────────────────────────────────────────

export type QuickRange = 'today' | 'this-week' | 'last-week' | 'this-month' | 'last-month'
export type PeriodType = 'day' | 'week' | 'month'

export const QUICK_RANGES: { key: QuickRange; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'this-week', label: 'This Week' },
  { key: 'last-week', label: 'Last Week' },
  { key: 'this-month', label: 'This Month' },
  { key: 'last-month', label: 'Last Month' },
]

export function getQuickRange(type: QuickRange): { from: string; to: string; period: PeriodType } {
  const now = new Date()
  if (type === 'today') {
    const today = formatDate(now)
    return { from: today, to: today, period: 'day' }
  }
  if (type === 'this-week') {
    const mon = new Date(now)
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    return { from: formatDate(mon), to: formatDate(sun), period: 'week' }
  }
  if (type === 'last-week') {
    const mon = new Date(now)
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7) - 7)
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    return { from: formatDate(mon), to: formatDate(sun), period: 'week' }
  }
  if (type === 'this-month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1)
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { from: formatDate(first), to: formatDate(last), period: 'month' }
  }
  // last-month
  const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const last = new Date(now.getFullYear(), now.getMonth(), 0)
  return { from: formatDate(first), to: formatDate(last), period: 'month' }
}
