import { useState, useEffect, useCallback } from 'react'
import type { Tag } from '@/types'
import { getTags, saveTags } from '@/storage'
import { generateId } from '@/utils/id'

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([])

  const fetch = useCallback(async () => {
    const data = await getTags()
    setTags(data)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const create = useCallback(async (name: string) => {
    const tag: Tag = { id: generateId(), name }
    const current = await getTags()
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

  return { tags, create, update, remove, refetch: fetch }
}
