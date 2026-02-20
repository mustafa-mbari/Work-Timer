'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Tag, Star, Pencil, Trash2, GripVertical, Plus, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TagFull } from '@/lib/repositories/tags'

function generateId(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36)
}

interface Props {
  initialTags: TagFull[]
}

export default function TagsCard({ initialTags }: Props) {
  const [tags, setTags] = useState<TagFull[]>(initialTags)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // --- Drag & Drop ---

  function handleDragStart(id: string) {
    setDraggingId(id)
  }

  function handleDragEnd() {
    setDraggingId(null)
    setDragOverId(null)
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
    const ids = tags.map(t => t.id)
    const fromIdx = ids.indexOf(draggingId)
    const toIdx = ids.indexOf(targetId)
    const reordered = [...ids]
    reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, draggingId)

    // Optimistic update
    const tagMap = new Map(tags.map(t => [t.id, t]))
    setTags(reordered.map((id, i) => ({ ...tagMap.get(id)!, sort_order: i })))
    setDraggingId(null)
    setDragOverId(null)

    const res = await fetch('/api/tags?action=reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: reordered }),
    })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to reorder tags')
      setTags(initialTags)
    }
  }

  // --- Set Default ---

  async function handleSetDefault(id: string) {
    const prev = tags
    setTags(tags.map(t => ({ ...t, is_default: t.id === id })))
    const res = await fetch(`/api/tags/${id}`, { method: 'PATCH' })
    if (!res.ok) {
      setTags(prev)
      const data = await res.json()
      toast.error(data.error ?? 'Failed to set default tag')
    }
  }

  // --- Edit ---

  function startEdit(tag: TagFull) {
    setEditingId(tag.id)
    setEditName(tag.name)
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return
    setSaving(true)
    const prev = tags
    setTags(tags.map(t => t.id === id ? { ...t, name: editName.trim() } : t))
    setEditingId(null)

    const res = await fetch(`/api/tags/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    })
    setSaving(false)
    if (!res.ok) {
      setTags(prev)
      const data = await res.json()
      toast.error(data.error ?? 'Failed to update tag')
    }
  }

  // --- Delete ---

  async function handleDelete(id: string) {
    const prev = tags
    setTags(tags.filter(t => t.id !== id))
    const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      setTags(prev)
      const data = await res.json()
      toast.error(data.error ?? 'Failed to delete tag')
    }
  }

  // --- Add ---

  async function handleAdd() {
    if (!newName.trim()) return
    setSaving(true)
    const id = generateId()
    const newTag: TagFull = {
      id,
      name: newName.trim(),
      is_default: false,
      sort_order: tags.length,
    }
    const prev = tags
    setTags([...tags, newTag])
    setNewName('')
    setShowAddForm(false)

    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: newTag.name }),
    })
    setSaving(false)
    if (!res.ok) {
      setTags(prev)
      const data = await res.json()
      toast.error(data.error ?? 'Failed to create tag')
      setShowAddForm(true)
      setNewName(newTag.name)
    }
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-[var(--dark-card)] border border-slate-100 dark:border-[var(--dark-border)] shadow-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[var(--dark-border)]">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
            <Tag className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-800 dark:text-slate-100">Tags</span>
            {tags.length > 0 && (
              <span className="text-xs text-slate-400 dark:text-slate-500">{tags.length}</span>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 rounded-lg"
          onClick={() => { setShowAddForm(!showAddForm); setNewName('') }}
          title="Add tag"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        {/* Add form */}
        {showAddForm && (
          <div className="px-5 py-3 border-b border-slate-100 dark:border-[var(--dark-border)] bg-slate-50 dark:bg-[var(--dark-elevated)]">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAddForm(false) }}
                placeholder="Tag name"
                autoFocus
                className="flex-1 text-sm bg-white dark:bg-[var(--dark-card)] border border-slate-200 dark:border-[var(--dark-border)] rounded-lg px-3 py-1.5 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={handleAdd}
                disabled={!newName.trim() || saving}
                className="h-8 w-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center text-white flex-shrink-0"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-200 dark:hover:bg-[var(--dark-hover)] flex items-center justify-center text-slate-400 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tags list */}
        <div className="divide-y divide-slate-50 dark:divide-[var(--dark-border)] max-h-72 overflow-y-auto">
          {tags.length === 0 && !showAddForm && (
            <div className="px-5 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
              No tags yet. Click + to add one.
            </div>
          )}
          {tags.map(tag => (
            <div
              key={tag.id}
              draggable
              onDragStart={() => handleDragStart(tag.id)}
              onDragEnd={handleDragEnd}
              onDragOver={e => handleDragOver(e, tag.id)}
              onDrop={() => handleDrop(tag.id)}
              className={`flex items-center gap-2 px-4 py-2.5 group transition-colors ${
                draggingId === tag.id ? 'opacity-40' : ''
              } ${dragOverId === tag.id ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'hover:bg-slate-50 dark:hover:bg-[var(--dark-hover)]'}`}
            >
              {/* Drag handle */}
              <GripVertical className="h-4 w-4 text-slate-300 dark:text-slate-600 cursor-grab flex-shrink-0 opacity-0 group-hover:opacity-100" />

              {/* Tag indicator */}
              <Tag className="h-3 w-3 text-slate-300 dark:text-slate-600 flex-shrink-0" />

              {/* Name / Edit inline */}
              {editingId === tag.id ? (
                <div className="flex-1 flex items-center gap-1.5 min-w-0">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(tag.id); if (e.key === 'Escape') setEditingId(null) }}
                    autoFocus
                    className="flex-1 text-sm bg-white dark:bg-[var(--dark-card)] border border-emerald-400 rounded-md px-2 py-0.5 text-slate-800 dark:text-slate-100 focus:outline-none min-w-0"
                  />
                  <button onClick={() => saveEdit(tag.id)} disabled={saving} className="text-emerald-500 hover:text-emerald-700 flex-shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <span className="flex-1 text-sm text-slate-700 dark:text-slate-200 truncate">
                  {tag.name}
                </span>
              )}

              {/* Actions */}
              {editingId !== tag.id && (
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => handleSetDefault(tag.id)}
                    title={tag.is_default ? 'Default tag' : 'Set as default'}
                    className={`h-6 w-6 rounded-md flex items-center justify-center transition-colors ${
                      tag.is_default
                        ? 'text-amber-400'
                        : 'text-slate-200 dark:text-slate-700 hover:text-amber-400 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <Star className={`h-3.5 w-3.5 ${tag.is_default ? 'fill-amber-400' : ''}`} />
                  </button>
                  <button
                    onClick={() => startEdit(tag)}
                    title="Edit"
                    className="h-6 w-6 rounded-md flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(tag.id)}
                    title="Delete"
                    className="h-6 w-6 rounded-md flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
