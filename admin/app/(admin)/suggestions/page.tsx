'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Lightbulb, ChevronDown, ChevronUp, X, Save } from 'lucide-react'
import type { DbFeatureSuggestion } from '@/lib/shared/types'

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'implemented', label: 'Implemented' },
  { value: 'declined', label: 'Declined' },
]

const IMPORTANCE_OPTIONS = [
  { value: 'nice_to_have', label: 'Nice to Have' },
  { value: 'important', label: 'Important' },
  { value: 'critical', label: 'Critical' },
]

function statusColor(status: string) {
  switch (status) {
    case 'new': return 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
    case 'under_review': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
    case 'planned': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    case 'in_progress': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
    case 'implemented': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
    case 'declined': return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
    default: return ''
  }
}

function importanceColor(importance: string) {
  switch (importance) {
    case 'nice_to_have': return 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
    case 'important': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
    case 'critical': return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
    default: return ''
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const SUGGESTION_TYPE_LABELS: Record<string, string> = {
  feature: 'New Feature',
  improvement: 'Improvement',
  integration: 'Integration',
  ui_ux: 'UI/UX',
  other: 'Other',
}

const PLATFORM_LABELS: Record<string, string> = {
  chrome_extension: 'Chrome Extension',
  web_app: 'Web App',
  both: 'Both',
}

export default function AdminSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<DbFeatureSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterImportance, setFilterImportance] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState<string>('')
  const [editNotes, setEditNotes] = useState<string>('')
  const [saving, setSaving] = useState(false)

  async function fetchSuggestions() {
    const params = new URLSearchParams()
    if (filterStatus !== 'all') params.set('status', filterStatus)
    if (filterImportance !== 'all') params.set('importance', filterImportance)
    const res = await fetch(`/api/suggestions?${params}`)
    const data = await res.json()
    setSuggestions(data.suggestions ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchSuggestions() // eslint-disable-line react-hooks/set-state-in-effect
  }, [filterStatus, filterImportance]) // eslint-disable-line react-hooks/exhaustive-deps

  function expandSuggestion(suggestion: DbFeatureSuggestion) {
    if (expandedId === suggestion.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(suggestion.id)
    setEditStatus(suggestion.status)
    setEditNotes(suggestion.admin_notes ?? '')
  }

  async function saveSuggestion(id: string) {
    setSaving(true)
    const res = await fetch('/api/suggestions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: editStatus, admin_notes: editNotes || null }),
    })

    if (res.ok) {
      toast.success('Suggestion updated')
      setExpandedId(null)
      await fetchSuggestions()
    } else {
      const data = await res.json()
      toast.error(data.error || 'Failed to update suggestion')
    }
    setSaving(false)
  }

  const stats = {
    total: suggestions.length,
    new: suggestions.filter(s => s.status === 'new').length,
    under_review: suggestions.filter(s => s.status === 'under_review').length,
    planned: suggestions.filter(s => s.status === 'planned').length,
    implemented: suggestions.filter(s => s.status === 'implemented').length,
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Card><CardContent className="pt-6 h-24 animate-pulse bg-stone-100 dark:bg-[var(--dark-elevated)] rounded-lg" /></Card>
        <Card><CardContent className="pt-6 h-64 animate-pulse bg-stone-100 dark:bg-[var(--dark-elevated)] rounded-lg" /></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-stone-900 dark:text-stone-100' },
          { label: 'New', value: stats.new, color: 'text-stone-600 dark:text-stone-400' },
          { label: 'Under Review', value: stats.under_review, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Planned', value: stats.planned, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Implemented', value: stats.implemented, color: 'text-emerald-600 dark:text-emerald-400' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Lightbulb className="h-5 w-5 text-indigo-500" />
        <h2 className="font-semibold text-stone-900 dark:text-stone-100">Feature Suggestions</h2>
        <div className="ml-auto flex items-center gap-2">
          <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setLoading(true) }}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterImportance} onValueChange={v => { setFilterImportance(v); setLoading(true) }}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Importance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {IMPORTANCE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30px]" />
                <TableHead>Title</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Importance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suggestions.length > 0 ? suggestions.map(suggestion => (
                <>
                  <TableRow
                    key={suggestion.id}
                    className="cursor-pointer hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)]"
                    onClick={() => expandSuggestion(suggestion)}
                  >
                    <TableCell className="w-[30px] px-2">
                      {expandedId === suggestion.id
                        ? <ChevronUp className="h-4 w-4 text-stone-400" />
                        : <ChevronDown className="h-4 w-4 text-stone-400" />}
                    </TableCell>
                    <TableCell className="font-medium text-stone-900 dark:text-stone-100 max-w-[200px] truncate">
                      {suggestion.title}
                    </TableCell>
                    <TableCell className="text-sm text-stone-600 dark:text-stone-300">
                      <div className="truncate max-w-[150px]">{suggestion.user_name || suggestion.user_email}</div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-stone-500 dark:text-stone-400">
                        {SUGGESTION_TYPE_LABELS[suggestion.suggestion_type] ?? suggestion.suggestion_type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={importanceColor(suggestion.importance)}>
                        {suggestion.importance.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColor(suggestion.status)}>
                        {suggestion.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">
                      {formatDate(suggestion.created_at)}
                    </TableCell>
                  </TableRow>

                  {expandedId === suggestion.id && (
                    <TableRow key={`${suggestion.id}-detail`}>
                      <TableCell colSpan={7} className="bg-stone-50 dark:bg-[var(--dark-elevated)] p-0">
                        <div className="px-6 py-4 space-y-4">
                          {/* Info grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-stone-400 mb-0.5">Email</p>
                              <p className="text-stone-700 dark:text-stone-200">{suggestion.user_email}</p>
                            </div>
                            <div>
                              <p className="text-xs text-stone-400 mb-0.5">Platform</p>
                              <p className="text-stone-700 dark:text-stone-200">{PLATFORM_LABELS[suggestion.target_platform] ?? suggestion.target_platform}</p>
                            </div>
                            <div>
                              <p className="text-xs text-stone-400 mb-0.5">Notify on Release</p>
                              <p className="text-stone-700 dark:text-stone-200">{suggestion.notify_on_release ? 'Yes' : 'No'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-stone-400 mb-0.5">Suggestion Type</p>
                              <p className="text-stone-700 dark:text-stone-200">{SUGGESTION_TYPE_LABELS[suggestion.suggestion_type] ?? suggestion.suggestion_type}</p>
                            </div>
                          </div>

                          {/* Description */}
                          <div>
                            <p className="text-xs text-stone-400 mb-1">Description</p>
                            <div className="text-sm text-stone-700 dark:text-stone-200 whitespace-pre-wrap bg-white dark:bg-[var(--dark-card)] rounded-lg border border-stone-200 dark:border-[var(--dark-border)] p-3 max-h-48 overflow-y-auto">
                              {suggestion.description}
                            </div>
                          </div>

                          {/* Admin controls */}
                          <div className="flex flex-col sm:flex-row gap-3">
                            <div className="space-y-1 sm:w-48">
                              <p className="text-xs text-stone-400">Update Status</p>
                              <Select value={editStatus} onValueChange={setEditStatus}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1 flex-1">
                              <p className="text-xs text-stone-400">Admin Notes</p>
                              <textarea
                                value={editNotes}
                                onChange={e => setEditNotes(e.target.value)}
                                placeholder="Internal notes..."
                                rows={2}
                                className="w-full rounded-lg border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] text-sm text-stone-700 dark:text-stone-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => setExpandedId(null)}>
                              <X className="h-3.5 w-3.5 mr-1" />
                              Cancel
                            </Button>
                            <Button size="sm" disabled={saving} onClick={() => saveSuggestion(suggestion.id)}>
                              <Save className="h-3.5 w-3.5 mr-1" />
                              {saving ? 'Saving…' : 'Save'}
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-stone-500 dark:text-stone-400">
                    No suggestions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
