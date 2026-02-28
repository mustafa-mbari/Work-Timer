import { describe, it, expect } from 'vitest'
import { formatDuration, formatDurationShort, msToHours, getWeekDays, durationBetween } from './date'

describe('formatDuration', () => {
  it('formats zero', () => {
    expect(formatDuration(0)).toBe('00:00:00')
  })

  it('formats seconds only', () => {
    expect(formatDuration(45000)).toBe('00:00:45')
  })

  it('formats minutes and seconds', () => {
    expect(formatDuration(125000)).toBe('00:02:05')
  })

  it('formats hours, minutes, seconds', () => {
    expect(formatDuration(3661000)).toBe('01:01:01')
  })

  it('handles large durations', () => {
    expect(formatDuration(86400000)).toBe('24:00:00') // 24 hours
  })
})

describe('formatDurationShort', () => {
  it('shows only minutes when under 1 hour', () => {
    expect(formatDurationShort(1800000)).toBe('30m') // 30 min
  })

  it('shows hours and minutes', () => {
    expect(formatDurationShort(5400000)).toBe('1h 30m') // 1h 30m
  })

  it('shows 0m for zero', () => {
    expect(formatDurationShort(0)).toBe('0m')
  })
})

describe('msToHours', () => {
  it('converts ms to hours rounded to 2 decimals', () => {
    expect(msToHours(3600000)).toBe(1)
    expect(msToHours(5400000)).toBe(1.5)
    expect(msToHours(0)).toBe(0)
  })
})

describe('durationBetween', () => {
  it('returns difference in ms', () => {
    const start = 1705312800000
    const end = 1705316400000
    expect(durationBetween(start, end)).toBe(3600000)
  })
})

describe('getWeekDays', () => {
  it('returns 5 days starting Monday by default', () => {
    const days = getWeekDays(new Date('2025-01-15'), 1, 5)
    expect(days).toHaveLength(5)
    expect(days[0].getDay()).toBe(1) // Monday
    expect(days[4].getDay()).toBe(5) // Friday
  })

  it('returns 7 days when workingDays=7', () => {
    const days = getWeekDays(new Date('2025-01-15'), 1, 7)
    expect(days).toHaveLength(7)
  })

  it('starts on Sunday when weekStartsOn=0', () => {
    const days = getWeekDays(new Date('2025-01-15'), 0, 5)
    expect(days[0].getDay()).toBe(0) // Sunday
  })
})
