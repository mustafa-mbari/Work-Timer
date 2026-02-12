import { format, startOfWeek, endOfWeek, addDays, differenceInMilliseconds, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'

export function getToday(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'yyyy-MM-dd')
}

export function formatTime(timestamp: number): string {
  return format(new Date(timestamp), 'HH:mm')
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const hh = String(hours).padStart(2, '0')
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

export function formatDurationShort(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

export function getWeekRange(date: Date, weekStartsOn: 0 | 1 = 1): { start: Date; end: Date } {
  const start = startOfWeek(date, { weekStartsOn })
  const end = endOfWeek(date, { weekStartsOn })
  return { start, end }
}

export function getWeekDays(date: Date, weekStartsOn: 0 | 1 = 1, workingDays: number = 5): Date[] {
  const { start } = getWeekRange(date, weekStartsOn)
  return Array.from({ length: workingDays }, (_, i) => addDays(start, i))
}

export function durationBetween(startTime: number, endTime: number): number {
  return differenceInMilliseconds(new Date(endTime), new Date(startTime))
}

export function msToHours(ms: number): number {
  return Math.round((ms / 3600000) * 100) / 100
}

export function getMonthDays(year: number, month: number): Date[] {
  const d = new Date(year, month, 1)
  return eachDayOfInterval({ start: startOfMonth(d), end: endOfMonth(d) })
}
