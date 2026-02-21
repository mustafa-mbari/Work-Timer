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
import { Globe, Plus, Power, PowerOff } from 'lucide-react'

export default function AdminDomainsPage() {
  const t = useTranslations('admin.domains')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [domains, setDomains] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [domain, setDomain] = useState('')
  const [plan, setPlan] = useState('premium_monthly')

  const PLAN_LABELS: Record<string, string> = {
    premium_monthly: t('planPremiumMonthly'),
    premium_yearly: t('planPremiumYearly'),
    premium_lifetime: t('planPremiumLifetime'),
  }

  async function fetchDomains() {
    const res = await fetch('/api/admin/domains')
    const data = await res.json()
    setDomains(data.domains ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchDomains() // eslint-disable-line react-hooks/set-state-in-effect
  }, [])

  async function addDomain(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    const trimmed = domain.trim().toLowerCase()

    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(trimmed)) {
      toast.error(t('invalidFormat'))
      setSubmitting(false)
      return
    }

    if (domains.some(d => d.domain === trimmed)) {
      toast.error(t('alreadyWhitelisted'))
      setSubmitting(false)
      return
    }

    const res = await fetch('/api/admin/domains', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: trimmed, plan }),
    })
    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error || t('addFailed'))
    } else {
      toast.success(t('added', { domain: trimmed }))
      setDomain('')
    }

    setSubmitting(false)
    await fetchDomains()
  }

  async function toggleActive(id: string, active: boolean, domainName: string) {
    const res = await fetch('/api/admin/domains', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    })

    if (res.ok) {
      toast.success(active ? t('deactivated', { domain: domainName }) : t('activated', { domain: domainName }))
    } else {
      toast.error(t('updateFailed'))
    }

    await fetchDomains()
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
      {/* Add Domain Form */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-5 w-5 text-indigo-500" />
            <h2 className="font-semibold text-stone-900 dark:text-stone-100">{t('addTitle')}</h2>
          </div>
          <form onSubmit={addDomain} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="domain">{t('colDomain')}</Label>
              <Input
                id="domain"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                placeholder="example.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('colPlan')}</Label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="premium_monthly">{t('planMonthly')}</SelectItem>
                  <SelectItem value="premium_yearly">{t('planYearly')}</SelectItem>
                  <SelectItem value="premium_lifetime">{t('planLifetime')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={submitting}>
                <Plus className="h-4 w-4 mr-1" />
                {submitting ? t('adding') : t('add')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Domains Table */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b border-stone-100 dark:border-[var(--dark-border)]">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-stone-900 dark:text-stone-100">{t('tableTitle')}</h2>
              <Badge variant="secondary">{t('total', { count: domains.length })}</Badge>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('colDomain')}</TableHead>
                <TableHead>{t('colPlan')}</TableHead>
                <TableHead>{t('colStatus')}</TableHead>
                <TableHead className="text-right">{t('colActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {domains.length > 0 ? domains.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium text-stone-900 dark:text-stone-100">
                    {d.domain}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{PLAN_LABELS[d.plan] || d.plan}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={d.active ? 'default' : 'secondary'}>
                      {d.active ? t('statusActive') : t('statusInactive')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          {d.active ? <PowerOff className="h-3.5 w-3.5 mr-1" /> : <Power className="h-3.5 w-3.5 mr-1" />}
                          {d.active ? t('deactivate') : t('activate')}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {d.active ? t('confirmDeactivateTitle', { domain: d.domain }) : t('confirmActivateTitle', { domain: d.domain })}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {d.active ? t('confirmDeactivateDesc') : t('confirmActivateDesc')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => toggleActive(d.id, d.active, d.domain)}>
                            {t('confirm')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-stone-500 dark:text-stone-400">
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
