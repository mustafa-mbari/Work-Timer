'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LifeBuoy, Send, Loader2 } from 'lucide-react'

const ISSUE_TYPES = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'account', label: 'Account Issue' },
  { value: 'billing', label: 'Billing Question' },
  { value: 'sync', label: 'Sync Problem' },
  { value: 'performance', label: 'Performance Issue' },
  { value: 'other', label: 'Other' },
]

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

const PLATFORMS = [
  { value: 'chrome_extension', label: 'Chrome Extension' },
  { value: 'web_app', label: 'Web App' },
  { value: 'both', label: 'Both' },
]

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  resolved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  closed: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  urgent: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
}

interface Ticket {
  id: string
  subject: string
  issue_type: string
  priority: string
  status: string
  platform: string
  created_at: string
}

interface Props {
  userEmail: string
  userName: string | null
}

export default function SupportPage({ userEmail, userName }: Props) {
  const [issueType, setIssueType] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [platform, setPlatform] = useState('web_app')
  const [issueTime, setIssueTime] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loadingTickets, setLoadingTickets] = useState(true)

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch('/api/support')
      if (res.ok) setTickets(await res.json())
    } catch {
      // silently fail
    } finally {
      setLoadingTickets(false)
    }
  }, [])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!issueType || !subject.trim() || !description.trim()) {
      toast.error('Please fill in all required fields')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issue_type: issueType,
          subject: subject.trim(),
          description: description.trim(),
          priority,
          platform,
          issue_time: issueTime || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit ticket')
      }
      toast.success('Support ticket submitted successfully')
      setIssueType('')
      setSubject('')
      setDescription('')
      setPriority('medium')
      setPlatform('web_app')
      setIssueTime('')
      fetchTickets()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit ticket')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in">
      {/* Submit Ticket Form */}
      <div className="bg-white dark:bg-[var(--dark-card)] rounded-2xl border border-stone-200 dark:border-[var(--dark-border)] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
            <LifeBuoy className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">Submit a Support Ticket</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">Logged in as {userName || userEmail}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issue-type">Issue Type *</Label>
              <Select value={issueType} onValueChange={setIssueType}>
                <SelectTrigger id="issue-type">
                  <SelectValue placeholder="Select issue type" />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Brief summary of the issue"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe your issue in detail..."
              maxLength={5000}
              rows={5}
              className="flex w-full rounded-lg border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark)] px-3 py-2 text-sm text-stone-800 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="platform">Where</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger id="platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="issue-time">Time of Issue (optional)</Label>
              <Input
                id="issue-time"
                type="datetime-local"
                value={issueTime}
                onChange={e => setIssueTime(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {submitting ? 'Submitting...' : 'Submit Ticket'}
          </Button>
        </form>
      </div>

      {/* My Tickets */}
      <div className="bg-white dark:bg-[var(--dark-card)] rounded-2xl border border-stone-200 dark:border-[var(--dark-border)] p-6">
        <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4">My Tickets</h2>

        {loadingTickets ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
          </div>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400 text-center py-8">
            No tickets submitted yet.
          </p>
        ) : (
          <div className="space-y-3">
            {tickets.map(ticket => (
              <div
                key={ticket.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-xl border border-stone-100 dark:border-[var(--dark-border)] hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 dark:text-stone-100 truncate">
                    {ticket.subject}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={PRIORITY_COLORS[ticket.priority]}>
                    {PRIORITIES.find(p => p.value === ticket.priority)?.label}
                  </Badge>
                  <Badge variant="outline" className={STATUS_COLORS[ticket.status]}>
                    {STATUS_LABELS[ticket.status]}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
