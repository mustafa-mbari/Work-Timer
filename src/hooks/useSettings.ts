import { useState, useEffect, useCallback } from 'react'
import type { Settings } from '@/types'
import { getSettings, updateSettings } from '@/storage'

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)

  const fetch = useCallback(async () => {
    const data = await getSettings()
    setSettings(data)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const update = useCallback(async (partial: Partial<Settings>) => {
    await updateSettings(partial)
    await fetch()
  }, [fetch])

  return { settings, update, refetch: fetch }
}
