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

  // Re-fetch when a remote sync updates projects
  useEffect(() => {
    const listener = (message: { action?: string; table?: string }) => {
      if (message.action === 'SYNC_REMOTE_UPDATE' && message.table === 'projects') {
        void fetch()
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [fetch])

  const activeProjects = projects.filter(p => !p.archived)

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
    return project
  }, [fetch, projects])

  const update = useCallback(async (project: Project) => {
    await updateProject(project)
    await fetch()
  }, [fetch])

  const archive = useCallback(async (id: string) => {
    await archiveProject(id)
    await fetch()
  }, [fetch])

  return { projects, activeProjects, loading, create, update, archive, refetch: fetch }
}
