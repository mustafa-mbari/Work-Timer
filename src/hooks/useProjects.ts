import { useState, useEffect, useCallback } from 'react'
import type { Project } from '@/types'
import { getProjects, saveProject, updateProject, archiveProject, deleteProject, setDefaultProject, reorderProjects } from '@/storage'
import { generateId } from '@/utils/id'
import { getCachedSubscription } from '@/auth/authState'
import { getLimits } from '@/premium/featureGate'

export class ProjectLimitError extends Error {
  constructor() {
    super('You have reached the 5-project limit on the free plan.')
    this.name = 'ProjectLimitError'
  }
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const data = await getProjects()
    setProjects(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch]) // eslint-disable-line react-hooks/set-state-in-effect

  // Re-fetch when storage changes
  useEffect(() => {
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes['projects']) {
        void fetch()
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [fetch])

  const activeProjects = projects
    .filter(p => !p.archived)
    .sort((a, b) => {
      const ao = a.order ?? Infinity
      const bo = b.order ?? Infinity
      if (ao !== bo) return ao - bo
      return a.createdAt - b.createdAt
    })

  const syncNow = () => {
    chrome.runtime.sendMessage({ action: 'SYNC_NOW' }).catch(() => { })
  }

  const create = useCallback(async (name: string, color: string) => {
    const sub = await getCachedSubscription()
    const limits = getLimits(sub)
    const currentActive = projects.filter(p => !p.archived)
    if (currentActive.length >= limits.maxProjects) {
      throw new ProjectLimitError()
    }
    const project: Project = {
      id: generateId(),
      name,
      color,
      targetHours: null,
      archived: false,
      createdAt: Date.now(),
    }
    await saveProject(project)
    await fetch()
    syncNow()
    return project
  }, [fetch, projects])

  const update = useCallback(async (project: Project) => {
    await updateProject(project)
    await fetch()
    syncNow()
  }, [fetch])

  const archive = useCallback(async (id: string) => {
    await archiveProject(id)
    await fetch()
    syncNow()
  }, [fetch])

  const remove = useCallback(async (id: string) => {
    await deleteProject(id)
    await fetch()
    syncNow()
  }, [fetch])

  const setDefault = useCallback(async (id: string) => {
    await setDefaultProject(id)
    await fetch()
  }, [fetch])

  const reorder = useCallback(async (orderedIds: string[]) => {
    await reorderProjects(orderedIds)
    await fetch()
  }, [fetch])

  return { projects, activeProjects, loading, create, update, archive, remove, setDefault, reorder, refetch: fetch }
}
