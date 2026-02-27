import type { GroupShare } from '@/lib/repositories/groupShares'

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

export function formatPeriod(share: Pick<GroupShare, 'date_from' | 'date_to' | 'period_type'>): string {
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
