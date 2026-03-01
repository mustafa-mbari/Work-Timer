import { useState, useEffect, useCallback } from 'react'
import type { Tag } from '@/types'
import { getTags, saveTags } from '@/storage'
import { generateId } from '@/utils/id'
import { getCurrentLimits } from '@/premium/featureGate'

export class TagLimitError extends Error {
  constructor(limit: number = 5) {
    super(`You have reached the ${limit}-tag limit.`)
    this.name = 'TagLimitError'
  }
}

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([])

  const fetch = useCallback(async () => {
    const data = await getTags()
    setTags(data)
  }, [])

  useEffect(() => { fetch() }, [fetch]) // eslint-disable-line react-hooks/set-state-in-effect

  // Re-fetch when storage changes
  useEffect(() => {
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes['tags']) {
        void fetch()
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [fetch])

  const activeTags = tags
    .filter(t => !t.archived)
    .sort((a, b) => {
      const ao = a.order ?? Infinity
      const bo = b.order ?? Infinity
      if (ao !== bo) return ao - bo
      return 0
    })

  const create = useCallback(async (name: string, color?: string) => {
    const limits = await getCurrentLimits()
    const current = await getTags()
    // Count ALL tags (active + archived) to prevent bypass via archive-then-create
    if (current.length >= limits.maxTags) {
      throw new TagLimitError(limits.maxTags)
    }
    const tag: Tag = { id: generateId(), name, color: color ?? '#6366F1' }
    await saveTags([...current, tag])
    await fetch()
    return tag
  }, [fetch])

  const update = useCallback(async (tag: Tag) => {
    const current = await getTags()
    await saveTags(current.map(t => t.id === tag.id ? tag : t))
    await fetch()
  }, [fetch])

  const remove = useCallback(async (id: string) => {
    const current = await getTags()
    await saveTags(current.filter(t => t.id !== id))
    await fetch()
  }, [fetch])

  const archive = useCallback(async (id: string) => {
    const current = await getTags()
    await saveTags(current.map(t => t.id === id ? { ...t, archived: true } : t))
    await fetch()
  }, [fetch])

  const setDefault = useCallback(async (id: string) => {
    const current = await getTags()
    await saveTags(current.map(t => ({ ...t, isDefault: t.id === id ? true : undefined })))
    await fetch()
  }, [fetch])

  const reorder = useCallback(async (orderedIds: string[]) => {
    const current = await getTags()
    await saveTags(current.map(t => {
      const idx = orderedIds.indexOf(t.id)
      return idx !== -1 ? { ...t, order: idx } : t
    }))
    await fetch()
  }, [fetch])

  return { tags, activeTags, create, update, remove, archive, setDefault, reorder, refetch: fetch }
}
