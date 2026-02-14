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

  // Re-fetch when storage changes (local or remote)
  useEffect(() => {
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes[`entries_${targetDate}`]) {
        void fetch()
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [targetDate, fetch])

  const totalDuration = entries.reduce((sum, e) => sum + e.duration, 0)

  const syncNow = () => {
    chrome.runtime.sendMessage({ action: 'SYNC_NOW' }).catch(() => { })
  }

  const add = useCallback(async (entry: TimeEntry) => {
    await saveEntry(entry)
    await fetch()
    syncNow()
  }, [fetch])

  const update = useCallback(async (entry: TimeEntry) => {
    await updateEntry(entry)
    await fetch()
    syncNow()
  }, [fetch])

  const remove = useCallback(async (id: string) => {
    await deleteEntry(id, targetDate)
    await fetch()
    syncNow()
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

  // Re-fetch when storage changes
  useEffect(() => {
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local') {
        // If any entry key changed, refresh (simplistic but safe)
        const hasEntryChange = Object.keys(changes).some(k => k.startsWith('entries_'))
        if (hasEntryChange) void fetch()
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [fetch])

  return { entries, loading, refetch: fetch }
}
