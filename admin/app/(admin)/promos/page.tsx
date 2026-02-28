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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Ticket, Plus, Power, PowerOff } from 'lucide-react'

const PLAN_LABELS: Record<string, string> = {
  premium_monthly: 'Premium Monthly',
  premium_yearly: 'Premium Yearly',
  premium_lifetime: 'Premium Lifetime',
  allin_monthly: 'Team Monthly (Legacy)',
  allin_yearly: 'Team Yearly (Legacy)',
  team_10_monthly: 'Team (10) Monthly',
  team_10_yearly: 'Team (10) Yearly',
  team_20_monthly: 'Team (20) Monthly',
  team_20_yearly: 'Team (20) Yearly',
}

export default function AdminPromosPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [promos, setPromos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [code, setCode] = useState('')
  const [discountPct, setDiscountPct] = useState('')
  const [plan, setPlan] = useState('premium_monthly')
  const [maxUses, setMaxUses] = useState('')

  async function fetchPromos() {
    const res = await fetch('/api/promos')
    const data = await res.json()
    setPromos(data.promos ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchPromos() // eslint-disable-line react-hooks/set-state-in-effect
  }, [])

  async function addPromo(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    const trimmedCode = code.trim().toUpperCase()
    const discount = parseInt(discountPct)
    const uses = maxUses ? parseInt(maxUses) : null

    if (!trimmedCode || trimmedCode.length < 3 || trimmedCode.length > 50) {
      toast.error('Code must be 3–50 characters')
      setSubmitting(false)
      return
    }

    if (isNaN(discount) || discount < 1 || discount > 100) {
      toast.error('Discount must be between 1 and 100')
      setSubmitting(false)
      return
    }

    if (uses !== null && (isNaN(uses) || uses < 1)) {
      toast.error('Max uses must be at least 1')
      setSubmitting(false)
      return
    }

    const res = await fetch('/api/promos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: trimmedCode, discount_pct: discount, plan, max_uses: uses }),
    })
    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error || 'Failed to create promo code')
    } else {
      toast.success(`Promo code "${trimmedCode}" created`)
      setCode('')
      setDiscountPct('')
      setMaxUses('')
    }

    setSubmitting(false)
    await fetchPromos()
  }

  async function toggleActive(id: string, active: boolean, promoCode: string) {
    const res = await fetch('/api/promos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    })

    if (res.ok) {
      toast.success(active ? `"${promoCode}" deactivated` : `"${promoCode}" activated`)
    } else {
      toast.error('Failed to update promo code')
    }

    await fetchPromos()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Card><CardContent className="pt-6 h-40 animate-pulse bg-stone-100 dark:bg-[var(--dark-elevated)] rounded-lg" /></Card>
        <Card><CardContent className="pt-6 h-48 animate-pulse bg-stone-100 dark:bg-[var(--dark-elevated)] rounded-lg" /></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Create Promo Form */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Ticket className="h-5 w-5 text-indigo-500" />
            <h2 className="font-semibold text-stone-900 dark:text-stone-100">Create Promo Code</h2>
          </div>
          <form onSubmit={addPromo} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="LAUNCH50"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="discount">Discount (%)</Label>
              <Input
                id="discount"
                type="number"
                min="1"
                max="100"
                value={discountPct}
                onChange={e => setDiscountPct(e.target.value)}
                placeholder="50"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger>
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
              <Label htmlFor="maxUses">Max Uses (optional)</Label>
              <Input
                id="maxUses"
                type="number"
                min="1"
                value={maxUses}
                onChange={e => setMaxUses(e.target.value)}
                placeholder="Unlimited"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={submitting} className="w-full">
                <Plus className="h-4 w-4 mr-1" />
                {submitting ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Promos Table */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b border-stone-100 dark:border-[var(--dark-border)]">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-stone-900 dark:text-stone-100">Promo Codes</h2>
              <Badge variant="secondary">{promos.length} total</Badge>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Uses</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promos.length > 0 ? promos.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono font-medium text-stone-900 dark:text-stone-100">
                    {p.code}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{p.discount_pct}%</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-stone-600 dark:text-stone-300">
                    {PLAN_LABELS[p.plan] || p.plan}
                  </TableCell>
                  <TableCell className="text-sm text-stone-600 dark:text-stone-300">
                    {p.current_uses}{p.max_uses ? ` / ${p.max_uses}` : ''}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.active ? 'default' : 'secondary'}>
                      {p.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          {p.active ? <PowerOff className="h-3.5 w-3.5 mr-1" /> : <Power className="h-3.5 w-3.5 mr-1" />}
                          {p.active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {p.active ? `Deactivate "${p.code}"?` : `Activate "${p.code}"?`}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {p.active
                              ? 'This promo code will no longer be redeemable.'
                              : 'This promo code will become redeemable again.'}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => toggleActive(p.id, p.active, p.code)}>
                            Confirm
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-stone-500 dark:text-stone-400">
                    No promo codes yet.
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
