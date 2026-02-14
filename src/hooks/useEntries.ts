import { useState, useEffect, useCallback } from 'react'
import type { TimeEntry } from '@/types'
import { getEntries, getEntriesByRange, saveEntry, updateEntry, deleteEntry } from '@/storage'
import { getToday } from '@/utils/date'
import { getCachedSubscription } from '@/auth/authState'
import { getLimits } from '@/premium/featureGate'
import { subDays, parseISO, max, format } from 'date-fns'

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

  // Re-fetch when a remote sync updates entries (Realtime or pull sync)
  useEffect(() => {
    const listener = (message: { action?: string; table?: string }) => {
      if (message.action === 'SYNC_REMOTE_UPDATE' && message.table === 'time_entries') {
        void fetch()
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [fetch])

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
    // Clamp start date to 30 days ago for free users (local data preserved, just hidden)
    const sub = await getCachedSubscription()
    const limits = getLimits(sub)
    let effectiveStart = startDate
    if (isFinite(limits.historyDays)) {
      const earliest = format(subDays(new Date(), limits.historyDays), 'yyyy-MM-dd')
      effectiveStart = format(max([parseISO(startDate), parseISO(earliest)]), 'yyyy-MM-dd')
    }
    const data = await getEntriesByRange(effectiveStart, endDate)
    setEntries(data)
    setLoading(false)
  }, [startDate, endDate])

  useEffect(() => { fetch() }, [fetch])

  return { entries, loading, refetch: fetch }
}
