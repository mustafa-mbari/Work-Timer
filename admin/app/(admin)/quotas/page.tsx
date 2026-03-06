'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Gauge, Save, Plus, Trash2 } from 'lucide-react'

interface QuotaLimit {
  role_name: string
  resource_type: string
  monthly_limit: number
}

const ROLES = ['free', 'pro', 'team'] as const
const ROLE_COLORS: Record<string, string> = {
  free: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  pro: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  team: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
}

export default function AdminQuotasPage() {
  const [limits, setLimits] = useState<QuotaLimit[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editedCells, setEditedCells] = useState<Map<string, number>>(new Map())
  const [newResourceType, setNewResourceType] = useState('')
  const [newLimits, setNewLimits] = useState<Record<string, string>>({ free: '', pro: '', team: '' })

  async function fetchLimits() {
    const res = await fetch('/api/quotas')
    const data = await res.json()
    setLimits(data.limits ?? [])
    setLoading(false)
    setEditedCells(new Map())
  }

  useEffect(() => {
    fetchLimits() // eslint-disable-line react-hooks/set-state-in-effect
  }, [])

  // Group limits by resource_type
  const resourceTypes = [...new Set(limits.map(l => l.resource_type))].sort()

  function getLimit(resource: string, role: string): number {
    return limits.find(l => l.resource_type === resource && l.role_name === role)?.monthly_limit ?? 0
  }

  function cellKey(resource: string, role: string) {
    return `${resource}:${role}`
  }

  function handleCellChange(resource: string, role: string, value: string) {
    const num = parseInt(value) || 0
    const key = cellKey(resource, role)
    const original = getLimit(resource, role)

    const next = new Map(editedCells)
    if (num === original) {
      next.delete(key)
    } else {
      next.set(key, num)
    }
    setEditedCells(next)
  }

  function getCellValue(resource: string, role: string): number {
    const key = cellKey(resource, role)
    return editedCells.has(key) ? editedCells.get(key)! : getLimit(resource, role)
  }

  async function saveCell(resource: string, role: string) {
    const key = cellKey(resource, role)
    const value = editedCells.get(key)
    if (value === undefined) return

    setSaving(key)
    const res = await fetch('/api/quotas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_name: role, resource_type: resource, monthly_limit: value }),
    })

    if (res.ok) {
      toast.success(`Updated ${resource} limit for ${role}: ${value}/mo`)
      const next = new Map(editedCells)
      next.delete(key)
      setEditedCells(next)
      await fetchLimits()
    } else {
      const data = await res.json()
      toast.error(data.error || 'Failed to update limit')
    }
    setSaving(null)
  }

  async function saveAllEdited() {
    if (editedCells.size === 0) return
    setSaving('all')

    const entries = Array.from(editedCells.entries())
    let successCount = 0

    for (const [key, value] of entries) {
      const [resource, role] = key.split(':')
      const res = await fetch('/api/quotas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_name: role, resource_type: resource, monthly_limit: value }),
      })
      if (res.ok) successCount++
    }

    if (successCount === entries.length) {
      toast.success(`Updated ${successCount} quota limit${successCount > 1 ? 's' : ''}`)
    } else {
      toast.error(`Updated ${successCount}/${entries.length} limits (some failed)`)
    }

    await fetchLimits()
    setSaving(null)
  }

  async function addResourceType(e: React.FormEvent) {
    e.preventDefault()
    const resource = newResourceType.trim().toLowerCase()
    if (!resource) {
      toast.error('Resource type name is required')
      return
    }
    if (resourceTypes.includes(resource)) {
      toast.error('Resource type already exists')
      return
    }

    setSaving('add')
    let successCount = 0

    for (const role of ROLES) {
      const limit = parseInt(newLimits[role]) || 0
      const res = await fetch('/api/quotas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_name: role, resource_type: resource, monthly_limit: limit }),
      })
      if (res.ok) successCount++
    }

    if (successCount === ROLES.length) {
      toast.success(`Added resource type "${resource}"`)
      setNewResourceType('')
      setNewLimits({ free: '', pro: '', team: '' })
    } else {
      toast.error('Some limits failed to save')
    }

    await fetchLimits()
    setSaving(null)
  }

  async function deleteResourceType(resource: string) {
    // Set all limits to 0 (effectively removing quotas for this resource)
    setSaving(`delete:${resource}`)
    for (const role of ROLES) {
      await fetch('/api/quotas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_name: role, resource_type: resource, monthly_limit: 0 }),
      })
    }
    toast.success(`Set all limits for "${resource}" to 0`)
    await fetchLimits()
    setSaving(null)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Card><CardContent className="pt-6 h-40 animate-pulse bg-stone-100 dark:bg-[var(--dark-elevated)] rounded-lg" /></Card>
        <Card><CardContent className="pt-6 h-64 animate-pulse bg-stone-100 dark:bg-[var(--dark-elevated)] rounded-lg" /></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {ROLES.map(role => {
          const roleLimits = limits.filter(l => l.role_name === role)
          const total = roleLimits.reduce((sum, l) => sum + l.monthly_limit, 0)
          return (
            <Card key={role}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-stone-500 dark:text-stone-400 capitalize">{role} tier</p>
                    <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{total.toLocaleString()}</p>
                    <p className="text-xs text-stone-400 dark:text-stone-500">total mutations/mo</p>
                  </div>
                  <Badge className={ROLE_COLORS[role]}>{roleLimits.length} resources</Badge>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quota Limits Table */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b border-stone-100 dark:border-[var(--dark-border)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-indigo-500" />
                <h2 className="font-semibold text-stone-900 dark:text-stone-100">API Quota Limits</h2>
                <Badge variant="secondary">{resourceTypes.length} resource types</Badge>
              </div>
              {editedCells.size > 0 && (
                <Button
                  size="sm"
                  onClick={saveAllEdited}
                  disabled={saving === 'all'}
                >
                  <Save className="h-4 w-4 mr-1" />
                  {saving === 'all' ? 'Saving...' : `Save ${editedCells.size} change${editedCells.size > 1 ? 's' : ''}`}
                </Button>
              )}
            </div>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
              Monthly mutation limits per plan tier. Edit a cell and click Save to update.
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Resource</TableHead>
                {ROLES.map(role => (
                  <TableHead key={role} className="text-center capitalize">{role}</TableHead>
                ))}
                <TableHead className="text-right w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resourceTypes.length > 0 ? resourceTypes.map(resource => (
                <TableRow key={resource}>
                  <TableCell className="font-mono font-medium text-stone-900 dark:text-stone-100">
                    {resource}
                  </TableCell>
                  {ROLES.map(role => {
                    const key = cellKey(resource, role)
                    const isEdited = editedCells.has(key)
                    return (
                      <TableCell key={role} className="text-center p-1">
                        <Input
                          type="number"
                          min="0"
                          className={`w-24 mx-auto text-center h-8 text-sm ${
                            isEdited
                              ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-500'
                              : ''
                          }`}
                          value={getCellValue(resource, role)}
                          onChange={e => handleCellChange(resource, role, e.target.value)}
                        />
                      </TableCell>
                    )
                  })}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {ROLES.some(r => editedCells.has(cellKey(resource, r))) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={saving === cellKey(resource, ROLES.find(r => editedCells.has(cellKey(resource, r)))!)}
                          onClick={() => {
                            for (const role of ROLES) {
                              if (editedCells.has(cellKey(resource, role))) {
                                saveCell(resource, role)
                              }
                            }
                          }}
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-stone-400 hover:text-rose-500"
                        disabled={saving === `delete:${resource}`}
                        onClick={() => deleteResourceType(resource)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-stone-500 dark:text-stone-400">
                    No quota limits configured.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add New Resource Type */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="h-5 w-5 text-indigo-500" />
            <h2 className="font-semibold text-stone-900 dark:text-stone-100">Add Resource Type</h2>
          </div>
          <form onSubmit={addResourceType} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Resource Name</label>
              <Input
                value={newResourceType}
                onChange={e => setNewResourceType(e.target.value)}
                placeholder="e.g., devices"
                required
              />
            </div>
            {ROLES.map(role => (
              <div key={role} className="space-y-1.5">
                <label className="text-sm font-medium text-stone-700 dark:text-stone-300 capitalize">{role} limit</label>
                <Input
                  type="number"
                  min="0"
                  value={newLimits[role]}
                  onChange={e => setNewLimits(prev => ({ ...prev, [role]: e.target.value }))}
                  placeholder="0"
                />
              </div>
            ))}
            <Button type="submit" disabled={saving === 'add'}>
              <Plus className="h-4 w-4 mr-1" />
              {saving === 'add' ? 'Adding...' : 'Add'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
