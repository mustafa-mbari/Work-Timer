'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Eye, EyeOff, FolderKanban } from 'lucide-react'

interface ProjectItem {
  id: string
  name: string
  color: string
}

interface Props {
  groupId: string
  projects: ProjectItem[]
}

export default function SharingSettingsPanel({ groupId, projects }: Props) {
  const [sharingEnabled, setSharingEnabled] = useState(false)
  const [sharedProjectIds, setSharedProjectIds] = useState<string[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch(`/api/groups/${groupId}/sharing`)
      .then(r => r.json())
      .then(data => {
        setSharingEnabled(data.sharing_enabled ?? false)
        setSharedProjectIds(data.shared_project_ids ?? null)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [groupId])

  async function save(enabled: boolean, projectIds: string[] | null) {
    setSaving(true)
    const res = await fetch(`/api/groups/${groupId}/sharing`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sharing_enabled: enabled,
        shared_project_ids: projectIds,
      }),
    })
    setSaving(false)
    if (res.ok) {
      toast.success('Sharing settings updated')
    } else {
      toast.error('Failed to update settings')
    }
  }

  function handleToggleSharing() {
    const next = !sharingEnabled
    setSharingEnabled(next)
    save(next, sharedProjectIds)
  }

  function handleToggleProject(projectId: string) {
    let next: string[] | null
    if (sharedProjectIds === null) {
      // Currently sharing all — switch to sharing all except this one
      next = projects.filter(p => p.id !== projectId).map(p => p.id)
    } else if (sharedProjectIds.includes(projectId)) {
      // Remove this project
      next = sharedProjectIds.filter(id => id !== projectId)
      if (next.length === 0) next = []
    } else {
      // Add this project
      next = [...sharedProjectIds, projectId]
      // If all selected, switch back to null (all)
      if (next.length === projects.length) next = null
    }
    setSharedProjectIds(next)
    save(sharingEnabled, next)
  }

  function isProjectShared(projectId: string) {
    return sharedProjectIds === null || sharedProjectIds.includes(projectId)
  }

  if (!loaded) {
    return (
      <div className="py-6 flex justify-center">
        <div className="h-5 w-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main toggle */}
      <div className="flex items-center justify-between rounded-xl bg-stone-50 dark:bg-[var(--dark-elevated)] px-4 py-3">
        <div className="flex items-center gap-3">
          {sharingEnabled ? (
            <Eye className="h-4 w-4 text-emerald-500" />
          ) : (
            <EyeOff className="h-4 w-4 text-stone-400" />
          )}
          <div>
            <p className="text-sm font-medium text-stone-700 dark:text-stone-200">Share my time data</p>
            <p className="text-xs text-stone-400 dark:text-stone-500">
              {sharingEnabled ? 'Group admins can view your hours' : 'Your data is private'}
            </p>
          </div>
        </div>
        <button
          onClick={handleToggleSharing}
          disabled={saving}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
            sharingEnabled ? 'bg-emerald-500' : 'bg-stone-200 dark:bg-stone-700'
          } ${saving ? 'opacity-60' : ''}`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              sharingEnabled ? 'translate-x-5.5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Project filter */}
      {sharingEnabled && projects.length > 0 && (
        <div className="rounded-xl border border-stone-100 dark:border-[var(--dark-border)] overflow-hidden">
          <div className="px-4 py-2.5 bg-stone-50 dark:bg-[var(--dark-elevated)] flex items-center gap-2">
            <FolderKanban className="h-3.5 w-3.5 text-stone-400" />
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
              Shared Projects
            </span>
            <span className="text-xs text-stone-400 dark:text-stone-500 ml-auto">
              {sharedProjectIds === null ? 'All' : `${sharedProjectIds.length} of ${projects.length}`}
            </span>
          </div>
          <div className="divide-y divide-stone-50 dark:divide-[var(--dark-border)]">
            {projects.map(project => (
              <button
                key={project.id}
                onClick={() => handleToggleProject(project.id)}
                disabled={saving}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)] transition-colors"
              >
                <span
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: project.color }}
                />
                <span className="text-sm text-stone-700 dark:text-stone-200 truncate flex-1">{project.name}</span>
                <span className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                  isProjectShared(project.id)
                    ? 'bg-indigo-500 border-indigo-500'
                    : 'border-stone-300 dark:border-stone-600'
                }`}>
                  {isProjectShared(project.id) && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {sharingEnabled && projects.length === 0 && (
        <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-4">
          No projects to share. Create projects first.
        </p>
      )}
    </div>
  )
}
