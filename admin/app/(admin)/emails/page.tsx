'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Mail, MailCheck, CalendarDays, MailX, Send, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import type { DbEmailLog } from '@/lib/shared/types'

const TEMPLATE_OPTIONS = [
  { value: 'welcome', label: 'Welcome' },
  { value: 'group_invitation', label: 'Group Invitation' },
  { value: 'password_reset_confirmation', label: 'Password Reset' },
  { value: 'billing_notification', label: 'Billing Notification' },
  { value: 'invoice_receipt', label: 'Invoice Receipt' },
  { value: 'trial_ending', label: 'Trial Ending' },
]

const TYPE_BADGE_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  welcome: { label: 'Welcome', variant: 'default' },
  email_verification: { label: 'Verification', variant: 'secondary' },
  group_invitation: { label: 'Invitation', variant: 'secondary' },
  password_reset_confirmation: { label: 'Password', variant: 'outline' },
  billing_notification: { label: 'Billing', variant: 'default' },
  invoice_receipt: { label: 'Invoice', variant: 'default' },
  trial_ending: { label: 'Trial', variant: 'secondary' },
  test: { label: 'Test', variant: 'outline' },
}

interface Stats {
  today: number
  week: number
  month: number
  failed: number
}

const PAGE_SIZE = 20

export default function EmailsPage() {
  const [logs, setLogs] = useState<DbEmailLog[]>([])
  const [stats, setStats] = useState<Stats>({ today: 0, week: 0, month: 0, failed: 0 })
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)

  // Test email form
  const [testTo, setTestTo] = useState('')
  const [testTemplate, setTestTemplate] = useState('welcome')
  const [sending, setSending] = useState(false)

  // Preview
  const [previewTemplate, setPreviewTemplate] = useState('welcome')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/emails?limit=${PAGE_SIZE}&offset=${offset}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs)
        setStats(data.stats)
        setTotal(data.total)
      }
    } catch (err) {
      console.error('Failed to fetch email logs:', err)
    } finally {
      setLoading(false)
    }
  }, [offset])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleSendTest(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)

    try {
      const res = await fetch('/api/emails/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testTo, template: testTemplate }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to send')

      toast.success(`Test email sent to ${testTo}`)
      setTestTo('')
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send test email')
    } finally {
      setSending(false)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Emails</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Sent Today', value: stats.today, icon: Mail, color: 'text-indigo-600 dark:text-indigo-400' },
          { label: 'This Week', value: stats.week, icon: MailCheck, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'This Month', value: stats.month, icon: CalendarDays, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Failed', value: stats.failed, icon: MailX, color: 'text-rose-600 dark:text-rose-400' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <div>
                  <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{stat.value}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Send test email + Template preview */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Send test email */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-4">
              <Send className="h-4 w-4 text-stone-500" />
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Send Test Email</h2>
            </div>
            <form onSubmit={handleSendTest} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="test-email">Recipient</Label>
                <Input
                  id="test-email"
                  type="email"
                  value={testTo}
                  onChange={e => setTestTo(e.target.value)}
                  required
                  placeholder="test@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Template</Label>
                <Select value={testTemplate} onValueChange={setTestTemplate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={sending} className="w-full">
                {sending ? 'Sending...' : 'Send Test Email'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Template preview */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="h-4 w-4 text-stone-500" />
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Template Preview</h2>
            </div>
            <Tabs value={previewTemplate} onValueChange={setPreviewTemplate}>
              <TabsList className="w-full mb-3 flex-wrap h-auto gap-1">
                {TEMPLATE_OPTIONS.map(opt => (
                  <TabsTrigger key={opt.value} value={opt.value} className="text-xs px-2 py-1">
                    {opt.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {TEMPLATE_OPTIONS.map(opt => (
                <TabsContent key={opt.value} value={opt.value}>
                  <div className="border border-stone-200 dark:border-[var(--dark-border)] rounded-lg overflow-hidden bg-white">
                    <iframe
                      src={`/api/emails/preview?template=${opt.value}`}
                      className="w-full h-[400px] border-0"
                      sandbox="allow-same-origin"
                      title={`${opt.label} preview`}
                    />
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Email log table */}
      <Card>
        <CardContent className="pt-5">
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-4">Email Log</h2>
          {loading ? (
            <div className="py-8 text-center text-stone-500 dark:text-stone-400">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-stone-500 dark:text-stone-400">No emails sent yet.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map(log => {
                      const typeBadge = TYPE_BADGE_MAP[log.type] || { label: log.type, variant: 'outline' as const }
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium text-sm">{log.recipient}</TableCell>
                          <TableCell>
                            <Badge variant={typeBadge.variant}>{typeBadge.label}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-stone-600 dark:text-stone-400 max-w-[200px] truncate">
                            {log.subject}
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.status === 'sent' ? 'default' : 'destructive'}>
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                            {formatDate(log.created_at)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset + PAGE_SIZE >= total}
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
