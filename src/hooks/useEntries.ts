import { useState, useEffect, useCallback } from 'react'
import type { TimeEntry } from '@/types'
import { getEntries, getEntriesByRange, saveEntry, updateEntry, deleteEntry } from '@/storage'
import { getToday } from '@/utils/date'

export function useEntries(date?: string) {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const targetDate = date ?? getToday()

  const fetch = useCallback(async () => {
    const data = await getEntries(targetDate)
    setEntries(data)
    setLoading(false)
  }, [targetDate])

  useEffect(() => { fetch() }, [fetch])

  const totalDuration = entries.reduce((sum, e) => sum + e.duration, 0)

  const add = useCallback(async (entry: TimeEntry) => {
    await saveEntry(entry)
    await fetch()
  }, [fetch])

  const update = useCallback(async (entry: TimeEntry) => {
    await updateEntry(entry)
    await fetch()
  }, [fetch])

  const remove = useCallback(async (id: string) => {
    await deleteEntry(id, targetDate)
    await fetch()
  }, [fetch, targetDate])

  return { entries, loading, totalDuration, add, update, remove, refetch: fetch }
}

export function useEntriesRange(startDate: string, endDate: string) {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const data = await getEntriesByRange(startDate, endDate)
    setEntries(data)
    setLoading(false)
  }, [startDate, endDate])

  useEffect(() => { fetch() }, [fetch])

  return { entries, loading, refetch: fetch }
}
