import { useState, useEffect, useCallback } from 'react'
import type { Project } from '@/types'
import { getProjects, saveProject, updateProject, archiveProject } from '@/storage'
import { generateId } from '@/utils/id'

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const data = await getProjects()
    setProjects(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const activeProjects = projects.filter(p => !p.archived)

  const create = useCallback(async (name: string, color: string) => {
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
  }, [fetch])

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
