'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Crown, UserPlus } from 'lucide-react'

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  premium_monthly: 'Premium Monthly',
  premium_yearly: 'Premium Yearly',
  allin_monthly: 'Team Monthly (Legacy)',
  allin_yearly: 'Team Yearly (Legacy)',
  team_10_monthly: 'Team (10) Monthly',
  team_10_yearly: 'Team (10) Yearly',
  team_20_monthly: 'Team (20) Monthly',
  team_20_yearly: 'Team (20) Yearly',
}

const SOURCE_LABELS: Record<string, string> = {
  stripe: 'Stripe',
  domain: 'Domain',
  promo: 'Promo Code',
  admin_manual: 'Manual Grant',
}

export default function AdminSubscriptionsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [email, setEmail] = useState('')
  const [plan, setPlan] = useState('premium_monthly')
  const [endDate, setEndDate] = useState('')

  async function fetchSubscriptions() {
    const res = await fetch('/api/subscriptions')
    const data = await res.json()
    setSubscriptions(data.subscriptions ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchSubscriptions() // eslint-disable-line react-hooks/set-state-in-effect
  }, [])

  async function grantPremium(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      toast.error('Email is required')
      setSubmitting(false)
      return
    }

    const res = await fetch('/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: trimmedEmail,
        plan,
        current_period_end: endDate ? new Date(endDate).toISOString() : null,
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error || 'Failed to grant premium')
    } else {
      toast.success(`Premium granted to ${trimmedEmail}`)
      setEmail('')
    }

    setSubmitting(false)
    await fetchSubscriptions()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Card><CardContent className="pt-6 h-32 animate-pulse bg-stone-100 dark:bg-[var(--dark-elevated)] rounded-lg" /></Card>
        <Card><CardContent className="pt-6 h-48 animate-pulse bg-stone-100 dark:bg-[var(--dark-elevated)] rounded-lg" /></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Grant Premium Form */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="h-5 w-5 text-indigo-500" />
            <h2 className="font-semibold text-stone-900 dark:text-stone-100">Grant Premium</h2>
          </div>
          <form onSubmit={grantPremium} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="email">User Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="premium_monthly">Premium Monthly</SelectItem>
                  <SelectItem value="premium_yearly">Premium Yearly</SelectItem>
                  <SelectItem value="team_10_monthly">Team (10) Monthly</SelectItem>
                  <SelectItem value="team_10_yearly">Team (10) Yearly</SelectItem>
                  <SelectItem value="team_20_monthly">Team (20) Monthly</SelectItem>
                  <SelectItem value="team_20_yearly">Team (20) Yearly</SelectItem>
                  <SelectItem value="allin_monthly">Team Monthly (Legacy)</SelectItem>
                  <SelectItem value="allin_yearly">Team Yearly (Legacy)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>End Date (optional)</Label>
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                placeholder="Optional"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={submitting}>
                <UserPlus className="h-4 w-4 mr-1" />
                {submitting ? 'Granting…' : 'Grant'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b border-stone-100 dark:border-[var(--dark-border)]">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-stone-900 dark:text-stone-100">Subscriptions</h2>
              <Badge variant="secondary">{subscriptions.length} total</Badge>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Period End</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.length > 0 ? subscriptions.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium text-stone-900 dark:text-stone-100">
                    <div>
                      <p className="text-sm font-medium">{s.display_name || s.email?.split('@')[0] || 'Unknown'}</p>
                      {s.email && <p className="text-xs text-stone-500 dark:text-stone-400">{s.email}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.plan === 'free' ? 'secondary' : 'default'}>
                      {PLAN_LABELS[s.plan] || s.plan}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.status === 'active' ? 'default' : 'outline'}>
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-stone-500 dark:text-stone-400">
                    {SOURCE_LABELS[s.granted_by] || s.granted_by || '—'}
                  </TableCell>
                  <TableCell className="text-sm text-stone-500 dark:text-stone-400">
                    {s.current_period_end
                      ? new Date(s.current_period_end).toLocaleDateString()
                      : '—'}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-stone-500 dark:text-stone-400">
                    No subscriptions yet.
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
