import { useState, useEffect, useCallback } from 'react'
import type { Project } from '@/types'
import { getProjects, saveProject, updateProject, archiveProject, deleteProject, setDefaultProject, reorderProjects } from '@/storage'
import { generateId } from '@/utils/id'
import { getCurrentLimits } from '@/premium/featureGate'

export class ProjectLimitError extends Error {
  constructor(limit: number = 5) {
    super(`You have reached the ${limit}-project limit.`)
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
    const limits = await getCurrentLimits()
    // Count ALL projects (active + archived) to prevent bypass via archive-then-create
    if (projects.length >= limits.maxProjects) {
      throw new ProjectLimitError(limits.maxProjects)
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
    syncNow()
  }, [fetch])

  const reorder = useCallback(async (orderedIds: string[]) => {
    await reorderProjects(orderedIds)
    await fetch()
    syncNow()
  }, [fetch])

  return { projects, activeProjects, loading, create, update, archive, remove, setDefault, reorder, refetch: fetch }
}
