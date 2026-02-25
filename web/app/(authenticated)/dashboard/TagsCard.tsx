'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Tag, Star, Pencil, Trash2, GripVertical, Plus, Check, X, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TagFull } from '@/lib/repositories/tags'

const TAG_COLORS = [
  '#6366F1', '#F43F5E', '#10B981', '#F59E0B', '#A855F7',
  '#EC4899', '#06B6D4', '#F97316', '#3B82F6', '#14B8A6',
]

function generateId(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36)
}

interface Props {
  initialTags: TagFull[]
  defaultHourlyRate?: number | null
  currency?: string
}

export default function TagsCard({ initialTags, defaultHourlyRate, currency = 'USD' }: Props) {
  const [tags, setTags] = useState<TagFull[]>(initialTags)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editRate, setEditRate] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(TAG_COLORS[0]!)
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
    setEditColor(tag.color)
    setEditRate(tag.hourly_rate != null ? String(tag.hourly_rate) : '')
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return
    setSaving(true)
    const parsedRate = editRate.trim() === '' ? null : parseFloat(editRate)
    const prev = tags
    setTags(tags.map(t => t.id === id ? { ...t, name: editName.trim(), color: editColor, hourly_rate: parsedRate } : t))
    setEditingId(null)

    const res = await fetch(`/api/tags/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), color: editColor, hourly_rate: parsedRate }),
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
      color: newColor,
      is_default: false,
      sort_order: tags.length,
      hourly_rate: null,
      earnings_enabled: false,
    }
    const prev = tags
    setTags([...tags, newTag])
    setNewName('')
    setNewColor(TAG_COLORS[0]!)
    setShowAddForm(false)

    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: newTag.name, color: newTag.color }),
    })
    setSaving(false)
    if (!res.ok) {
      setTags(prev)
      const data = await res.json()
      toast.error(data.error ?? 'Failed to create tag')
      setShowAddForm(true)
      setNewName(newTag.name)
      setNewColor(newTag.color)
    }
  }

  // --- Toggle Earnings ---

  async function handleToggleEarnings(id: string, current: boolean) {
    const prev = tags
    setTags(tags.map(t => t.id === id ? { ...t, earnings_enabled: !current } : t))
    const res = await fetch(`/api/tags/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ earnings_enabled: !current }),
    })
    if (!res.ok) {
      setTags(prev)
      toast.error('Failed to update earnings setting')
    }
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-[var(--dark-border)]">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
            <Tag className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-stone-800 dark:text-stone-100">Tags</span>
            {tags.length > 0 && (
              <span className="text-xs text-stone-400 dark:text-stone-500">{tags.length}</span>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 rounded-lg"
          onClick={() => { setShowAddForm(!showAddForm); setNewName(''); setNewColor(TAG_COLORS[0]!) }}
          title="Add tag"
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
                placeholder="Tag name"
                autoFocus
                className="flex-1 text-sm bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] rounded-lg px-3 py-1.5 text-stone-800 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                className="h-8 w-8 rounded-lg hover:bg-stone-200 dark:hover:bg-[var(--dark-hover)] flex items-center justify-center text-stone-400 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Color picker */}
            <div className="flex items-center gap-1.5">
              {TAG_COLORS.map(c => (
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

        {/* Tags list */}
        <div className="divide-y divide-stone-50 dark:divide-[var(--dark-border)] max-h-72 overflow-y-auto">
          {tags.length === 0 && !showAddForm && (
            <div className="px-5 py-6 text-center text-sm text-stone-400 dark:text-stone-500">
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
              } ${dragOverId === tag.id ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)]'}`}
            >
              {/* Drag handle */}
              <GripVertical className="h-4 w-4 text-stone-300 dark:text-stone-600 cursor-grab flex-shrink-0" />

              {/* Color dot */}
              <span
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: tag.color ?? '#6366F1' }}
              />

              {/* Name / Edit inline */}
              {editingId === tag.id ? (
                <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(tag.id); if (e.key === 'Escape') setEditingId(null) }}
                      autoFocus
                      className="flex-1 text-sm bg-white dark:bg-[var(--dark-card)] border border-emerald-400 rounded-md px-2 py-0.5 text-stone-800 dark:text-stone-100 focus:outline-none min-w-0"
                    />
                    <input
                      type="number"
                      value={editRate}
                      onChange={e => setEditRate(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(tag.id); if (e.key === 'Escape') setEditingId(null) }}
                      placeholder={defaultHourlyRate ? `Default (${defaultHourlyRate})` : 'Rate/hr'}
                      min="0"
                      step="0.01"
                      className="w-24 text-sm bg-white dark:bg-[var(--dark-card)] border border-stone-300 dark:border-[var(--dark-border)] rounded-md px-2 py-0.5 text-stone-800 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-emerald-400 flex-shrink-0"
                    />
                    <button onClick={() => saveEdit(tag.id)} disabled={saving} className="text-emerald-500 hover:text-emerald-700 flex-shrink-0">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-stone-400 hover:text-stone-600 flex-shrink-0">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {TAG_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setEditColor(c)}
                        className={`h-4 w-4 rounded-full transition-transform ${editColor === c ? 'ring-2 ring-offset-1 ring-stone-400 scale-110' : 'hover:scale-110'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-sm text-stone-700 dark:text-stone-200 truncate">
                    {tag.name}
                  </span>
                  {tag.hourly_rate != null && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 flex-shrink-0">{currency} {tag.hourly_rate}/hr</span>
                  )}
                </>
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
                        : 'text-stone-300 dark:text-stone-600 hover:text-amber-400'
                    }`}
                  >
                    <Star className={`h-3.5 w-3.5 ${tag.is_default ? 'fill-amber-400' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleToggleEarnings(tag.id, tag.earnings_enabled as boolean)}
                    title={(tag.earnings_enabled as boolean) ? 'Exclude from earnings' : 'Include in earnings'}
                    className={`h-6 w-6 rounded-md flex items-center justify-center transition-colors ${
                      (tag.earnings_enabled as boolean)
                        ? 'text-emerald-500'
                        : 'text-stone-300 dark:text-stone-600 hover:text-emerald-400'
                    }`}
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => startEdit(tag)}
                    title="Edit"
                    className="h-6 w-6 rounded-md flex items-center justify-center text-stone-300 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(tag.id)}
                    title="Delete"
                    className="h-6 w-6 rounded-md flex items-center justify-center text-stone-300 dark:text-stone-600 hover:text-rose-500 transition-colors"
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
