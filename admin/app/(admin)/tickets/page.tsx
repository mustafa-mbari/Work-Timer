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
import { LifeBuoy, ChevronDown, ChevronUp, X, Save } from 'lucide-react'
import type { DbSupportTicket } from '@/lib/shared/types'

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

function statusColor(status: string) {
  switch (status) {
    case 'open': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
    case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    case 'resolved': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
    case 'closed': return 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
    default: return ''
  }
}

function priorityColor(priority: string) {
  switch (priority) {
    case 'low': return 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
    case 'medium': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
    case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
    case 'urgent': return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
    default: return ''
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const ISSUE_TYPE_LABELS: Record<string, string> = {
  bug: 'Bug Report',
  account: 'Account Issue',
  billing: 'Billing',
  sync: 'Sync Problem',
  performance: 'Performance',
  other: 'Other',
}

const PLATFORM_LABELS: Record<string, string> = {
  chrome_extension: 'Chrome Extension',
  web_app: 'Web App',
  both: 'Both',
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<DbSupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState<string>('')
  const [editNotes, setEditNotes] = useState<string>('')
  const [saving, setSaving] = useState(false)

  async function fetchTickets() {
    const params = new URLSearchParams()
    if (filterStatus !== 'all') params.set('status', filterStatus)
    if (filterPriority !== 'all') params.set('priority', filterPriority)
    const res = await fetch(`/api/tickets?${params}`)
    const data = await res.json()
    setTickets(data.tickets ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchTickets() // eslint-disable-line react-hooks/set-state-in-effect
  }, [filterStatus, filterPriority]) // eslint-disable-line react-hooks/exhaustive-deps

  function expandTicket(ticket: DbSupportTicket) {
    if (expandedId === ticket.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(ticket.id)
    setEditStatus(ticket.status)
    setEditNotes(ticket.admin_notes ?? '')
  }

  async function saveTicket(id: string) {
    setSaving(true)
    const res = await fetch('/api/tickets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: editStatus, admin_notes: editNotes || null }),
    })

    if (res.ok) {
      toast.success('Ticket updated')
      setExpandedId(null)
      await fetchTickets()
    } else {
      const data = await res.json()
      toast.error(data.error || 'Failed to update ticket')
    }
    setSaving(false)
  }

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-stone-900 dark:text-stone-100' },
          { label: 'Open', value: stats.open, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'In Progress', value: stats.in_progress, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Resolved', value: stats.resolved, color: 'text-emerald-600 dark:text-emerald-400' },
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
        <LifeBuoy className="h-5 w-5 text-indigo-500" />
        <h2 className="font-semibold text-stone-900 dark:text-stone-100">Support Tickets</h2>
        <div className="ml-auto flex items-center gap-2">
          <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setLoading(true) }}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={v => { setFilterPriority(v); setLoading(true) }}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {PRIORITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
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
                <TableHead>Subject</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length > 0 ? tickets.map(ticket => (
                <>
                  <TableRow
                    key={ticket.id}
                    className="cursor-pointer hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)]"
                    onClick={() => expandTicket(ticket)}
                  >
                    <TableCell className="w-[30px] px-2">
                      {expandedId === ticket.id
                        ? <ChevronUp className="h-4 w-4 text-stone-400" />
                        : <ChevronDown className="h-4 w-4 text-stone-400" />}
                    </TableCell>
                    <TableCell className="font-medium text-stone-900 dark:text-stone-100 max-w-[200px] truncate">
                      {ticket.subject}
                    </TableCell>
                    <TableCell className="text-sm text-stone-600 dark:text-stone-300">
                      <div className="truncate max-w-[150px]">{ticket.user_name || ticket.user_email}</div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-stone-500 dark:text-stone-400">
                        {ISSUE_TYPE_LABELS[ticket.issue_type] ?? ticket.issue_type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={priorityColor(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColor(ticket.status)}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">
                      {formatDate(ticket.created_at)}
                    </TableCell>
                  </TableRow>

                  {expandedId === ticket.id && (
                    <TableRow key={`${ticket.id}-detail`}>
                      <TableCell colSpan={7} className="bg-stone-50 dark:bg-[var(--dark-elevated)] p-0">
                        <div className="px-6 py-4 space-y-4">
                          {/* Info grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-stone-400 mb-0.5">Email</p>
                              <p className="text-stone-700 dark:text-stone-200">{ticket.user_email}</p>
                            </div>
                            <div>
                              <p className="text-xs text-stone-400 mb-0.5">Platform</p>
                              <p className="text-stone-700 dark:text-stone-200">{PLATFORM_LABELS[ticket.platform] ?? ticket.platform}</p>
                            </div>
                            {ticket.issue_time && (
                              <div>
                                <p className="text-xs text-stone-400 mb-0.5">Issue Time</p>
                                <p className="text-stone-700 dark:text-stone-200">{formatDate(ticket.issue_time)}</p>
                              </div>
                            )}
                          </div>

                          {/* Description */}
                          <div>
                            <p className="text-xs text-stone-400 mb-1">Description</p>
                            <div className="text-sm text-stone-700 dark:text-stone-200 whitespace-pre-wrap bg-white dark:bg-[var(--dark-card)] rounded-lg border border-stone-200 dark:border-[var(--dark-border)] p-3 max-h-48 overflow-y-auto">
                              {ticket.description}
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
                            <Button size="sm" disabled={saving} onClick={() => saveTicket(ticket.id)}>
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
                    No tickets found.
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
