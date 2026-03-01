'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Send, Wifi, WifiOff, Loader2 } from 'lucide-react'

const TEMPLATE_OPTIONS = [
  { value: 'welcome', label: 'Welcome' },
  { value: 'group_invitation', label: 'Group Invitation' },
  { value: 'password_reset_confirmation', label: 'Password Reset' },
  { value: 'billing_notification', label: 'Billing Notification' },
  { value: 'invoice_receipt', label: 'Invoice Receipt' },
  { value: 'trial_ending', label: 'Trial Ending' },
]

type ConnStatus = 'idle' | 'testing' | 'ok' | 'error'

export default function SendTestTab() {
  const [testTo, setTestTo] = useState('')
  const [testTemplate, setTestTemplate] = useState('welcome')
  const [sending, setSending] = useState(false)

  const [connStatus, setConnStatus] = useState<ConnStatus>('idle')
  const [connError, setConnError] = useState<string | null>(null)

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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send test email')
    } finally {
      setSending(false)
    }
  }

  async function handleTestConnection() {
    setConnStatus('testing')
    setConnError(null)
    try {
      const res = await fetch('/api/emails/test-connection', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setConnStatus('ok')
        toast.success('SMTP connection successful')
      } else {
        setConnStatus('error')
        setConnError(data.error || 'Connection failed')
        toast.error(data.error || 'SMTP connection failed')
      }
    } catch {
      setConnStatus('error')
      setConnError('Network error')
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6 mt-6">
      {/* SMTP Connection Test */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-2 mb-4">
            {connStatus === 'ok'
              ? <Wifi className="h-4 w-4 text-emerald-500" />
              : connStatus === 'error'
                ? <WifiOff className="h-4 w-4 text-rose-500" />
                : <Wifi className="h-4 w-4 text-stone-400" />
            }
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">SMTP Connection</h2>
            {connStatus === 'ok' && <Badge variant="success">Connected</Badge>}
            {connStatus === 'error' && <Badge variant="destructive">Failed</Badge>}
          </div>

          <div className="space-y-3 mb-4 text-sm text-stone-600 dark:text-stone-400">
            <div className="flex justify-between">
              <span>Host</span>
              <code className="text-xs bg-stone-100 dark:bg-[var(--dark-elevated)] px-1.5 py-0.5 rounded">
                smtp.zoho.eu:465
              </code>
            </div>
            <div className="flex justify-between">
              <span>From</span>
              <code className="text-xs bg-stone-100 dark:bg-[var(--dark-elevated)] px-1.5 py-0.5 rounded">
                info@w-timer.com
              </code>
            </div>
            <div className="flex justify-between">
              <span>Security</span>
              <code className="text-xs bg-stone-100 dark:bg-[var(--dark-elevated)] px-1.5 py-0.5 rounded">
                SSL/TLS
              </code>
            </div>
          </div>

          {connError && (
            <p className="text-xs text-rose-600 dark:text-rose-400 mb-3 font-mono break-all">{connError}</p>
          )}

          <Button
            onClick={handleTestConnection}
            disabled={connStatus === 'testing'}
            variant="outline"
            className="w-full"
          >
            {connStatus === 'testing' ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Testing...</>
            ) : 'Test SMTP Connection'}
          </Button>
        </CardContent>
      </Card>

      {/* Send Test Email */}
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
    </div>
  )
}
