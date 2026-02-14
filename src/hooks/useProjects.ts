import { useState, useEffect, useCallback } from 'react'
import type { Project } from '@/types'
import { getProjects, saveProject, updateProject, archiveProject } from '@/storage'
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

  useEffect(() => { fetch() }, [fetch])

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

  const activeProjects = projects.filter(p => !p.archived)

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

  return { projects, activeProjects, loading, create, update, archive, refetch: fetch }
}
