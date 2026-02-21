'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { FolderOpen, Star, Pencil, Trash2, GripVertical, Plus, ChevronDown, ChevronUp, Archive, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProjectFull } from '@/lib/repositories/projects'

const FREE_PROJECT_LIMIT = 5

const PROJECT_COLORS = [
  '#6366F1', '#F43F5E', '#10B981', '#F59E0B', '#A855F7',
  '#EC4899', '#06B6D4', '#F97316', '#3B82F6', '#14B8A6',
]

function generateId(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36)
}

interface Props {
  initialProjects: ProjectFull[]
  isPremium: boolean
}

export default function ProjectsCard({ initialProjects, isPremium }: Props) {
  const [projects, setProjects] = useState<ProjectFull[]>(initialProjects)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PROJECT_COLORS[0]!)
  const [showArchived, setShowArchived] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const dragCounter = useRef(0)

  const activeProjects = projects.filter(p => !p.archived)
  const archivedProjects = projects.filter(p => p.archived)

  // --- Drag & Drop ---

  function handleDragStart(id: string) {
    setDraggingId(id)
  }

  function handleDragEnd() {
    setDraggingId(null)
    setDragOverId(null)
    dragCounter.current = 0
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault()
    if (id !== draggingId) setDragOverId(id)
  }

  async function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null)
      setDragOverId(null)
      return
    }
    const ids = activeProjects.map(p => p.id)
    const fromIdx = ids.indexOf(draggingId)
    const toIdx = ids.indexOf(targetId)
    const reordered = [...ids]
    reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, draggingId)

    // Optimistic update
    const projectMap = new Map(projects.map(p => [p.id, p]))
    const newOrder: ProjectFull[] = reordered.map((id, i) => ({ ...projectMap.get(id)!, sort_order: i }))
    setProjects([...newOrder, ...archivedProjects])
    setDraggingId(null)
    setDragOverId(null)

    const res = await fetch('/api/projects?action=reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: reordered }),
    })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to reorder projects')
      setProjects(initialProjects)
    }
  }

  // --- Set Default ---

  async function handleSetDefault(id: string) {
    const prev = projects
    setProjects(projects.map(p => ({ ...p, is_default: p.id === id })))
    const res = await fetch(`/api/projects/${id}`, { method: 'PATCH' })
    if (!res.ok) {
      setProjects(prev)
      const data = await res.json()
      toast.error(data.error ?? 'Failed to set default project')
    }
  }

  // --- Edit ---

  function startEdit(project: ProjectFull) {
    setEditingId(project.id)
    setEditName(project.name)
    setEditColor(project.color)
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return
    setSaving(true)
    const prev = projects
    setProjects(projects.map(p => p.id === id ? { ...p, name: editName.trim(), color: editColor } : p))
    setEditingId(null)

    const res = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), color: editColor }),
    })
    setSaving(false)
    if (!res.ok) {
      setProjects(prev)
      const data = await res.json()
      toast.error(data.error ?? 'Failed to update project')
    }
  }

  // --- Archive ---

  async function handleArchive(id: string) {
    const prev = projects
    setProjects(projects.map(p => p.id === id ? { ...p, archived: true, is_default: false } : p))
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: true }),
    })
    if (!res.ok) {
      setProjects(prev)
      const data = await res.json()
      toast.error(data.error ?? 'Failed to archive project')
    }
  }

  async function handleUnarchive(id: string) {
    const prev = projects
    setProjects(projects.map(p => p.id === id ? { ...p, archived: false } : p))
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: false }),
    })
    if (!res.ok) {
      setProjects(prev)
      const data = await res.json()
      toast.error(data.error ?? 'Failed to unarchive project')
    }
  }

  // --- Delete ---

  async function handleDelete(id: string) {
    const prev = projects
    setProjects(projects.filter(p => p.id !== id))
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      setProjects(prev)
      const data = await res.json()
      toast.error(data.error ?? 'Failed to delete project')
    }
  }

  // --- Add ---

  async function handleAdd() {
    if (!newName.trim()) return
    setSaving(true)
    const id = generateId()
    const newProject: ProjectFull = {
      id,
      name: newName.trim(),
      color: newColor,
      archived: false,
      is_default: false,
      sort_order: activeProjects.length,
      target_hours: null,
      created_at: Date.now(),
    }
    setProjects([...projects, newProject])
    setNewName('')
    setNewColor(PROJECT_COLORS[0]!)
    setShowAddForm(false)

    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: newProject.name, color: newProject.color }),
    })
    setSaving(false)
    if (!res.ok) {
      setProjects(projects)
      const data = await res.json()
      toast.error(data.error ?? 'Failed to create project')
      setShowAddForm(true)
      setNewName(newProject.name)
      setNewColor(newProject.color)
    }
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-[var(--dark-border)]">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
            <FolderOpen className="h-4 w-4 text-indigo-500" />
          </div>
          <div>
            <span className="font-semibold text-stone-800 dark:text-stone-100">Projects</span>
            {!isPremium && (
              <span className="ml-2 text-xs text-stone-400 dark:text-stone-500">
                {activeProjects.length}/{FREE_PROJECT_LIMIT}
              </span>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 rounded-lg"
          onClick={() => { setShowAddForm(!showAddForm); setNewName(''); setNewColor(PROJECT_COLORS[0]!) }}
          title="Add project"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        {/* Add form */}
        {showAddForm && (
          <div className="px-5 py-3 border-b border-stone-100 dark:border-[var(--dark-border)] bg-stone-50 dark:bg-[var(--dark-elevated)]">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAddForm(false) }}
                placeholder="Project name"
                autoFocus
                className="flex-1 text-sm bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] rounded-lg px-3 py-1.5 text-stone-800 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleAdd}
                disabled={!newName.trim() || saving}
                className="h-8 w-8 rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 flex items-center justify-center text-white flex-shrink-0"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="h-8 w-8 rounded-lg hover:bg-stone-200 dark:hover:bg-[var(--dark-hover)] flex items-center justify-center text-stone-400 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Color picker */}
            <div className="flex items-center gap-1.5">
              {PROJECT_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`h-5 w-5 rounded-full transition-transform ${newColor === c ? 'ring-2 ring-offset-1 ring-stone-400 scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        )}

        {/* Active projects list */}
        <div className="divide-y divide-stone-50 dark:divide-[var(--dark-border)] max-h-64 overflow-y-auto">
          {activeProjects.length === 0 && !showAddForm && (
            <div className="px-5 py-6 text-center text-sm text-stone-400 dark:text-stone-500">
              No projects yet. Click + to add one.
            </div>
          )}
          {activeProjects.map(project => (
            <div
              key={project.id}
              draggable
              onDragStart={() => handleDragStart(project.id)}
              onDragEnd={handleDragEnd}
              onDragOver={e => handleDragOver(e, project.id)}
              onDrop={() => handleDrop(project.id)}
              className={`flex items-center gap-2 px-4 py-2.5 group transition-colors ${
                draggingId === project.id ? 'opacity-40' : ''
              } ${dragOverId === project.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)]'}`}
            >
              {/* Drag handle */}
              <GripVertical className="h-4 w-4 text-stone-300 dark:text-stone-600 cursor-grab flex-shrink-0 opacity-0 group-hover:opacity-100" />

              {/* Color dot */}
              <span
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: project.color }}
              />

              {/* Name / Edit inline */}
              {editingId === project.id ? (
                <div className="flex-1 flex items-center gap-1.5 min-w-0">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(project.id); if (e.key === 'Escape') setEditingId(null) }}
                    autoFocus
                    className="flex-1 text-sm bg-white dark:bg-[var(--dark-card)] border border-indigo-400 rounded-md px-2 py-0.5 text-stone-800 dark:text-stone-100 focus:outline-none min-w-0"
                  />
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {PROJECT_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setEditColor(c)}
                        className={`h-4 w-4 rounded-full transition-transform ${editColor === c ? 'ring-2 ring-offset-1 ring-stone-400 scale-110' : 'hover:scale-110'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <button onClick={() => saveEdit(project.id)} disabled={saving} className="text-indigo-500 hover:text-indigo-700 flex-shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-stone-400 hover:text-stone-600 flex-shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-sm text-stone-700 dark:text-stone-200 truncate">
                    {project.name}
                  </span>
                  {project.target_hours != null && (
                    <span className="text-xs text-stone-400 dark:text-stone-500 flex-shrink-0">{project.target_hours}h</span>
                  )}
                </>
              )}

              {/* Actions (show on hover, always show default star if set) */}
              {editingId !== project.id && (
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => handleSetDefault(project.id)}
                    title={project.is_default ? 'Default project' : 'Set as default'}
                    className={`h-6 w-6 rounded-md flex items-center justify-center transition-colors ${
                      project.is_default
                        ? 'text-amber-400'
                        : 'text-stone-200 dark:text-stone-700 hover:text-amber-400 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <Star className={`h-3.5 w-3.5 ${project.is_default ? 'fill-amber-400' : ''}`} />
                  </button>
                  <button
                    onClick={() => startEdit(project)}
                    title="Edit"
                    className="h-6 w-6 rounded-md flex items-center justify-center text-stone-300 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-300 opacity-0 group-hover:opacity-100 transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleArchive(project.id)}
                    title="Archive"
                    className="h-6 w-6 rounded-md flex items-center justify-center text-stone-300 dark:text-stone-600 hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-colors"
                  >
                    <Archive className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    title="Delete"
                    className="h-6 w-6 rounded-md flex items-center justify-center text-stone-300 dark:text-stone-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Archived section */}
        {archivedProjects.length > 0 && (
          <div className="border-t border-stone-100 dark:border-[var(--dark-border)]">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="w-full flex items-center justify-between px-5 py-2.5 text-xs text-stone-400 dark:text-stone-500 hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)] transition-colors"
            >
              <span>Archived ({archivedProjects.length})</span>
              {showArchived ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showArchived && (
              <div className="divide-y divide-stone-50 dark:divide-[var(--dark-border)] max-h-40 overflow-y-auto">
                {archivedProjects.map(project => (
                  <div key={project.id} className="flex items-center gap-2 px-4 py-2 group opacity-60">
                    <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                    <span className="flex-1 text-sm text-stone-500 dark:text-stone-400 truncate line-through">{project.name}</span>
                    <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => handleUnarchive(project.id)}
                        title="Unarchive"
                        className="h-6 w-6 rounded-md flex items-center justify-center text-stone-400 hover:text-emerald-500 transition-colors"
                      >
                        <Archive className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(project.id)}
                        title="Delete permanently"
                        className="h-6 w-6 rounded-md flex items-center justify-center text-stone-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer hint */}
      {!isPremium && activeProjects.length >= FREE_PROJECT_LIMIT && (
        <div className="px-5 py-2.5 border-t border-stone-100 dark:border-[var(--dark-border)] text-xs text-stone-400 dark:text-stone-500">
          Project limit reached.{' '}
          <a href="/billing" className="text-indigo-500 hover:underline">Upgrade for unlimited.</a>
        </div>
      )}
    </div>
  )
}
