'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
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

export default function AdminPromosPage() {
  const t = useTranslations('admin.promos')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [promos, setPromos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [code, setCode] = useState('')
  const [discountPct, setDiscountPct] = useState('')
  const [plan, setPlan] = useState('premium_monthly')
  const [maxUses, setMaxUses] = useState('')

  const PLAN_LABELS: Record<string, string> = {
    premium_monthly: t('planMonthly'),
    premium_yearly: t('planYearly'),
    premium_lifetime: t('planLifetime'),
    allin_monthly: 'All-In Monthly',
    allin_yearly: 'All-In Yearly',
  }

  async function fetchPromos() {
    const res = await fetch('/api/admin/promos')
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
      toast.error(t('invalidCode'))
      setSubmitting(false)
      return
    }

    if (isNaN(discount) || discount < 1 || discount > 100) {
      toast.error(t('invalidDiscount'))
      setSubmitting(false)
      return
    }

    if (uses !== null && (isNaN(uses) || uses < 1)) {
      toast.error(t('invalidMaxUses'))
      setSubmitting(false)
      return
    }

    const res = await fetch('/api/admin/promos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: trimmedCode, discount_pct: discount, plan, max_uses: uses }),
    })
    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error || t('createFailed'))
    } else {
      toast.success(t('created', { code: trimmedCode }))
      setCode('')
      setDiscountPct('')
      setMaxUses('')
    }

    setSubmitting(false)
    await fetchPromos()
  }

  async function toggleActive(id: string, active: boolean, promoCode: string) {
    const res = await fetch('/api/admin/promos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    })

    if (res.ok) {
      toast.success(active ? t('deactivated', { code: promoCode }) : t('activated', { code: promoCode }))
    } else {
      toast.error(t('updateFailed'))
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
            <h2 className="font-semibold text-stone-900 dark:text-stone-100">{t('createTitle')}</h2>
          </div>
          <form onSubmit={addPromo} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="code">{t('code')}</Label>
              <Input
                id="code"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="LAUNCH50"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="discount">{t('discount')}</Label>
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
              <Label>{t('colPlan')}</Label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="premium_monthly">{t('planMonthly')}</SelectItem>
                  <SelectItem value="premium_yearly">{t('planYearly')}</SelectItem>
                  <SelectItem value="allin_monthly">All-In Monthly</SelectItem>
                  <SelectItem value="allin_yearly">All-In Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxUses">{t('maxUses')}</Label>
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
                {submitting ? t('creating') : t('create')}
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
              <h2 className="font-semibold text-stone-900 dark:text-stone-100">{t('tableTitle')}</h2>
              <Badge variant="secondary">{t('total', { count: promos.length })}</Badge>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('colCode')}</TableHead>
                <TableHead>{t('colDiscount')}</TableHead>
                <TableHead>{t('colPlan')}</TableHead>
                <TableHead>{t('colUses')}</TableHead>
                <TableHead>{t('colStatus')}</TableHead>
                <TableHead className="text-right">{t('colActions')}</TableHead>
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
                      {p.active ? t('statusActive') : t('statusInactive')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          {p.active ? <PowerOff className="h-3.5 w-3.5 mr-1" /> : <Power className="h-3.5 w-3.5 mr-1" />}
                          {p.active ? t('deactivate') : t('activate')}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {p.active ? t('confirmDeactivateTitle', { code: p.code }) : t('confirmActivateTitle', { code: p.code })}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {p.active ? t('confirmDeactivateDesc') : t('confirmActivateDesc')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => toggleActive(p.id, p.active, p.code)}>
                            {t('confirm')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-stone-500 dark:text-stone-400">
                    {t('empty')}
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
