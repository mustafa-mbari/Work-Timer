'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  User, Crown, Shield, Database, AlertTriangle, Calendar,
  Clock, FolderOpen, Tag, RefreshCw, Trash2, Mail,
  CheckCircle, XCircle, CreditCard, Key, UserX, Activity,
  Copy, Check,
} from 'lucide-react'
import type { UserDetails } from '@/lib/repositories/admin'

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

const STATUS_COLORS: Record<string, string> = {
  active: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
  trialing: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
  past_due: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
  expired: 'text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-700',
  free: 'text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-700',
}

const SOURCE_LABELS: Record<string, string> = {
  stripe: 'Stripe Payment',
  domain: 'Domain Whitelist',
  promo: 'Promo Code',
  admin_manual: 'Manual Grant',
}

function getInitials(displayName: string | null, email: string): string {
  if (displayName) {
    return displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="ml-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

interface Props {
  details: UserDetails
  userId: string
}

export default function UserDetailView({ details: initialDetails, userId }: Props) {
  const router = useRouter()
  const [details, setDetails] = useState(initialDetails)
  const [loading, setLoading] = useState<string | null>(null)

  // Subscription form state
  const [subPlan, setSubPlan] = useState(details.subscription?.plan ?? 'free')
  const [subStatus, setSubStatus] = useState(details.subscription?.status ?? 'free')
  const [subEndDate, setSubEndDate] = useState(
    details.subscription?.current_period_end
      ? new Date(details.subscription.current_period_end).toISOString().split('T')[0]
      : ''
  )

  // Role/name edit state
  const [editName, setEditName] = useState(details.profile.display_name ?? '')
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('')

  // Date range for entry deletion
  const [entryDateFrom, setEntryDateFrom] = useState('')
  const [entryDateTo, setEntryDateTo] = useState('')

  async function apiCall<T = unknown>(
    path: string,
    method: string,
    body?: unknown
  ): Promise<T | null> {
    try {
      const res = await fetch(`/api/users/${userId}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      return data as T
    } catch (err) {
      throw err
    }
  }

  async function refreshDetails() {
    try {
      const data = await apiCall<UserDetails>('', 'GET')
      if (data) setDetails(data)
    } catch {
      // silent — already showing stale data
    }
  }

  async function handleDeleteData(type: string, extra?: { dateFrom?: string; dateTo?: string }) {
    setLoading(`data-${type}`)
    try {
      const body: Record<string, string> = { type }
      if (extra?.dateFrom) body.dateFrom = extra.dateFrom
      if (extra?.dateTo) body.dateTo = extra.dateTo
      await apiCall('/data', 'DELETE', body)
      toast.success(type === 'all' ? 'All user data cleared' : `${type} cleared successfully`)
      await refreshDetails()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to clear data')
    } finally {
      setLoading(null)
    }
  }

  async function handleGrantSubscription() {
    setLoading('subscription')
    try {
      await apiCall('/subscription', 'POST', {
        plan: subPlan,
        status: subStatus,
        current_period_end: subEndDate ? new Date(subEndDate).toISOString() : null,
      })
      toast.success('Subscription updated')
      await refreshDetails()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update subscription')
    } finally {
      setLoading(null)
    }
  }

  async function handleRevokeSubscription() {
    setLoading('revoke')
    try {
      await apiCall('/subscription', 'POST', { plan: 'free', status: 'free', current_period_end: null })
      setSubPlan('free')
      setSubStatus('free')
      setSubEndDate('')
      toast.success('Subscription revoked — user is now on Free plan')
      await refreshDetails()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke subscription')
    } finally {
      setLoading(null)
    }
  }

  async function handleExtend30Days() {
    setLoading('extend')
    try {
      const baseDate = details.subscription?.current_period_end
        ? new Date(details.subscription.current_period_end)
        : new Date()
      const newEnd = new Date(baseDate)
      newEnd.setDate(newEnd.getDate() + 30)
      await apiCall('/subscription', 'POST', {
        plan: details.subscription?.plan ?? subPlan,
        status: 'active',
        current_period_end: newEnd.toISOString(),
      })
      toast.success('Extended by 30 days')
      await refreshDetails()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to extend subscription')
    } finally {
      setLoading(null)
    }
  }

  async function handleUpdateRole(role: 'admin' | 'user') {
    setLoading('role')
    try {
      await apiCall('', 'PATCH', { role })
      toast.success(`Role updated to ${role}`)
      setDetails(d => ({ ...d, profile: { ...d.profile, role } }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role')
    } finally {
      setLoading(null)
    }
  }

  async function handleUpdateName() {
    if (!editName.trim()) return
    setLoading('name')
    try {
      await apiCall('', 'PATCH', { display_name: editName.trim() })
      toast.success('Display name updated')
      setDetails(d => ({ ...d, profile: { ...d.profile, display_name: editName.trim() } }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update name')
    } finally {
      setLoading(null)
    }
  }

  async function handlePasswordReset() {
    setLoading('password')
    try {
      await apiCall('/password-reset', 'POST')
      toast.success(`Password reset email sent to ${details.profile.email}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reset email')
    } finally {
      setLoading(null)
    }
  }

  async function handleDeleteAccount() {
    setLoading('delete')
    try {
      await apiCall('', 'DELETE')
      toast.success('Account permanently deleted')
      router.push('/users')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete account')
      setLoading(null)
    }
  }

  const isStripeManaged = !!details.subscription?.stripe_subscription_id
  const initials = getInitials(details.profile.display_name, details.profile.email)
  const plan = details.subscription?.plan ?? 'free'
  const subStatus2 = details.subscription?.status ?? 'free'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-semibold text-lg">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100 truncate">
              {details.profile.display_name || details.profile.email.split('@')[0]}
            </h1>
            <Badge variant={details.profile.role === 'admin' ? 'default' : 'outline'} className="shrink-0">
              {details.profile.role === 'admin' ? <Shield className="h-3 w-3 mr-1" /> : <User className="h-3 w-3 mr-1" />}
              {details.profile.role}
            </Badge>
            <Badge variant={plan === 'free' ? 'secondary' : 'default'} className="shrink-0">
              <Crown className="h-3 w-3 mr-1" />
              {PLAN_LABELS[plan] ?? plan}
            </Badge>
          </div>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{details.profile.email}</p>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
            Joined {formatDate(details.profile.created_at)}
            {details.stats.last_active_date && (
              <> · Last active {formatDate(details.stats.last_active_date)}</>
            )}
            <span className="ml-2 font-mono opacity-60">{userId.slice(0, 8)}…</span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-1.5">
            <Database className="h-3.5 w-3.5" />
            Data
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            Subscription
          </TabsTrigger>
          <TabsTrigger value="danger" className="gap-1.5 data-[state=active]:text-rose-600 dark:data-[state=active]:text-rose-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            Danger Zone
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: OVERVIEW ── */}
        <TabsContent value="overview" className="space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Entries</span>
                </div>
                <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                  {details.stats.total_entries.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <FolderOpen className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Projects</span>
                </div>
                <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                  {details.stats.total_projects.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Tag className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Tags</span>
                </div>
                <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                  {details.stats.total_tags.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Profile + Subscription cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-5 pb-5">
                <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-stone-500" />
                  Profile
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-stone-500 dark:text-stone-400">Display Name</dt>
                    <dd className="font-medium text-stone-900 dark:text-stone-100">
                      {details.profile.display_name ?? <span className="text-stone-400 italic">Not set</span>}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-stone-500 dark:text-stone-400">Email</dt>
                    <dd className="font-medium text-stone-900 dark:text-stone-100">{details.profile.email}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-stone-500 dark:text-stone-400">Role</dt>
                    <dd>
                      <Badge variant={details.profile.role === 'admin' ? 'default' : 'outline'} className="text-xs">
                        {details.profile.role}
                      </Badge>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-stone-500 dark:text-stone-400">User ID</dt>
                    <dd className="flex items-center font-mono text-xs text-stone-500 dark:text-stone-400">
                      {userId.slice(0, 8)}…
                      <CopyButton text={userId} />
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-stone-500 dark:text-stone-400">Joined</dt>
                    <dd className="text-stone-600 dark:text-stone-300">{formatDate(details.profile.created_at)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-stone-500 dark:text-stone-400">Last Active</dt>
                    <dd className="text-stone-600 dark:text-stone-300">{formatDate(details.stats.last_active_date)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 pb-5">
                <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-stone-500" />
                  Subscription
                </h3>
                {details.subscription ? (
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-stone-500 dark:text-stone-400">Plan</dt>
                      <dd>
                        <Badge variant={plan === 'free' ? 'secondary' : 'default'} className="text-xs">
                          {PLAN_LABELS[plan] ?? plan}
                        </Badge>
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-stone-500 dark:text-stone-400">Status</dt>
                      <dd>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[subStatus2] ?? STATUS_COLORS.free}`}>
                          {subStatus2 === 'active' || subStatus2 === 'trialing'
                            ? <CheckCircle className="h-3 w-3" />
                            : <XCircle className="h-3 w-3" />}
                          {subStatus2}
                        </span>
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-stone-500 dark:text-stone-400">Source</dt>
                      <dd className="text-stone-600 dark:text-stone-300">
                        {SOURCE_LABELS[details.subscription.granted_by ?? ''] ?? details.subscription.granted_by ?? '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-stone-500 dark:text-stone-400">Expires</dt>
                      <dd className="text-stone-600 dark:text-stone-300">
                        {formatDate(details.subscription.current_period_end)}
                      </dd>
                    </div>
                    {details.subscription.stripe_subscription_id && (
                      <div className="flex justify-between">
                        <dt className="text-stone-500 dark:text-stone-400">Stripe Sub</dt>
                        <dd className="flex items-center font-mono text-xs text-stone-500 dark:text-stone-400">
                          {details.subscription.stripe_subscription_id.slice(0, 12)}…
                          <CopyButton text={details.subscription.stripe_subscription_id} />
                        </dd>
                      </div>
                    )}
                    {details.subscription.cancel_at_period_end && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Cancels at period end
                      </div>
                    )}
                  </dl>
                ) : (
                  <p className="text-sm text-stone-400 dark:text-stone-500 italic">No subscription record</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── TAB 2: DATA MANAGEMENT ── */}
        <TabsContent value="data" className="space-y-3">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Permanently delete specific data for this user. These actions cannot be undone.
          </p>

          {/* Time Entries */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-stone-500" />
                    <h4 className="font-medium text-stone-900 dark:text-stone-100">Time Entries</h4>
                    <Badge variant="secondary" className="text-xs">{details.stats.total_entries.toLocaleString()}</Badge>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Delete all time entries or filter by date range</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={loading !== null || details.stats.total_entries === 0}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Delete All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete All Time Entries?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all {details.stats.total_entries.toLocaleString()} time entries for <strong>{details.profile.email}</strong>. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-rose-600 hover:bg-rose-700 text-white"
                        onClick={() => handleDeleteData('entries')}
                      >
                        Delete All Entries
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Date range filter */}
              <div className="mt-4 pt-4 border-t border-stone-100 dark:border-[var(--dark-border)]">
                <p className="text-xs font-medium text-stone-600 dark:text-stone-400 mb-2">Or delete by date range:</p>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">From</Label>
                    <Input
                      type="date"
                      value={entryDateFrom}
                      onChange={e => setEntryDateFrom(e.target.value)}
                      className="h-8 text-xs w-36"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">To</Label>
                    <Input
                      type="date"
                      value={entryDateTo}
                      onChange={e => setEntryDateTo(e.target.value)}
                      className="h-8 text-xs w-36"
                    />
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
                        disabled={loading !== null || (!entryDateFrom && !entryDateTo)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Delete Range
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Entries in Date Range?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all entries for <strong>{details.profile.email}</strong>
                          {entryDateFrom && ` from ${entryDateFrom}`}
                          {entryDateTo && ` to ${entryDateTo}`}. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-rose-600 hover:bg-rose-700 text-white"
                          onClick={() => handleDeleteData('entries', { dateFrom: entryDateFrom || undefined, dateTo: entryDateTo || undefined })}
                        >
                          Delete Entries
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Projects */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <FolderOpen className="h-4 w-4 text-stone-500" />
                    <h4 className="font-medium text-stone-900 dark:text-stone-100">Projects</h4>
                    <Badge variant="secondary" className="text-xs">{details.stats.total_projects.toLocaleString()}</Badge>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Delete all projects. Entries linked to these projects will lose their project association.</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={loading !== null || details.stats.total_projects === 0}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Delete All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete All Projects?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all {details.stats.total_projects.toLocaleString()} projects for <strong>{details.profile.email}</strong>. Entries linked to these projects will lose their project association. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-rose-600 hover:bg-rose-700 text-white"
                        onClick={() => handleDeleteData('projects')}
                      >
                        Delete All Projects
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Tag className="h-4 w-4 text-stone-500" />
                    <h4 className="font-medium text-stone-900 dark:text-stone-100">Tags</h4>
                    <Badge variant="secondary" className="text-xs">{details.stats.total_tags.toLocaleString()}</Badge>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Delete all tags and remove them from entries.</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={loading !== null || details.stats.total_tags === 0}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Delete All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete All Tags?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all {details.stats.total_tags.toLocaleString()} tags for <strong>{details.profile.email}</strong>. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-rose-600 hover:bg-rose-700 text-white"
                        onClick={() => handleDeleteData('tags')}
                      >
                        Delete All Tags
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>

          {/* Settings + Sync + Quotas row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="h-4 w-4 text-amber-500" />
                  <h4 className="font-medium text-stone-900 dark:text-stone-100 text-sm">Settings</h4>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">Reset all user preferences to defaults.</p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/40" disabled={loading !== null}>
                      Reset Settings
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset User Settings?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will delete all settings for <strong>{details.profile.email}</strong>. They will be reset to defaults on their next login.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteData('settings')}>
                        Reset Settings
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="h-4 w-4 text-amber-500" />
                  <h4 className="font-medium text-stone-900 dark:text-stone-100 text-sm">Sync State</h4>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">Clear sync cursors to force a full re-sync.</p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/40" disabled={loading !== null}>
                      Clear Sync State
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear Sync State?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will delete all sync cursors for <strong>{details.profile.email}</strong>. Their extension will perform a full re-sync on next login.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteData('sync_cursors')}>
                        Clear Sync State
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="h-4 w-4 text-amber-500" />
                  <h4 className="font-medium text-stone-900 dark:text-stone-100 text-sm">Usage Quotas</h4>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">Reset monthly API and export usage counters.</p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/40" disabled={loading !== null}>
                      Reset Quotas
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset Usage Quotas?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will reset all API and export usage counters for <strong>{details.profile.email}</strong> for the current month.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteData('quotas')}>
                        Reset Quotas
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>

          {/* Delete Everything */}
          <Card className="border-rose-200 dark:border-rose-900">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Trash2 className="h-4 w-4 text-rose-500" />
                    <h4 className="font-medium text-rose-700 dark:text-rose-400">Clear All User Data</h4>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Delete all entries, projects, tags, settings, sync state, and quotas. The account itself is kept.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={loading !== null}>
                      Clear Everything
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear All User Data?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete ALL data for <strong>{details.profile.email}</strong>: all entries, projects, tags, settings, sync cursors, and quota records. The account itself will remain. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-rose-600 hover:bg-rose-700 text-white"
                        onClick={() => handleDeleteData('all')}
                      >
                        Clear All Data
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 3: SUBSCRIPTION ── */}
        <TabsContent value="subscription" className="space-y-4">
          {/* Current status banner */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-stone-500" />
                  Current Subscription
                </h3>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[subStatus2] ?? STATUS_COLORS.free}`}>
                  {subStatus2 === 'active' || subStatus2 === 'trialing'
                    ? <CheckCircle className="h-3.5 w-3.5" />
                    : <XCircle className="h-3.5 w-3.5" />}
                  {subStatus2}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-stone-500 dark:text-stone-400">Plan: </span>
                  <Badge variant={plan === 'free' ? 'secondary' : 'default'} className="ml-1">
                    {PLAN_LABELS[plan] ?? plan}
                  </Badge>
                </div>
                <div>
                  <span className="text-stone-500 dark:text-stone-400">Expires: </span>
                  <span className="font-medium text-stone-700 dark:text-stone-300">
                    {formatDate(details.subscription?.current_period_end ?? null)}
                  </span>
                </div>
                {details.subscription?.granted_by && (
                  <div>
                    <span className="text-stone-500 dark:text-stone-400">Source: </span>
                    <span className="font-medium text-stone-700 dark:text-stone-300">
                      {SOURCE_LABELS[details.subscription.granted_by] ?? details.subscription.granted_by}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stripe warning */}
          {isStripeManaged && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>This subscription is managed by Stripe. Manual changes here will override Stripe&apos;s billing, which may cause inconsistencies. Consider using the Stripe Dashboard for billing changes.</span>
            </div>
          )}

          {/* Change plan form */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-4 flex items-center gap-2">
                <Crown className="h-4 w-4 text-stone-500" />
                Grant / Change Plan
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Plan</Label>
                  <Select value={subPlan} onValueChange={setSubPlan}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
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
                  <Label className="text-xs">Status</Label>
                  <Select value={subStatus} onValueChange={setSubStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="trialing">Trialing</SelectItem>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="past_due">Past Due</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Expiry Date (optional)</Label>
                  <Input
                    type="date"
                    value={subEndDate}
                    onChange={e => setSubEndDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              <Button onClick={handleGrantSubscription} disabled={loading !== null} className="w-full sm:w-auto">
                {loading === 'subscription' ? 'Saving…' : 'Apply Plan'}
              </Button>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-4 pb-4">
                <h4 className="font-medium text-stone-900 dark:text-stone-100 mb-1 text-sm">Extend 30 Days</h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
                  Extend current period by 30 days from {details.subscription?.current_period_end ? 'current expiry' : 'today'}.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExtend30Days}
                  disabled={loading !== null || plan === 'free'}
                >
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  {loading === 'extend' ? 'Extending…' : 'Extend 30 Days'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-4">
                <h4 className="font-medium text-stone-900 dark:text-stone-100 mb-1 text-sm">Revoke Premium</h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
                  Immediately reset to Free plan and revoke all premium features.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
                      disabled={loading !== null || plan === 'free'}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      {loading === 'revoke' ? 'Revoking…' : 'Revoke Premium'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revoke Premium?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will immediately downgrade <strong>{details.profile.email}</strong> to the Free plan. They will lose access to all premium features.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-rose-600 hover:bg-rose-700 text-white"
                        onClick={handleRevokeSubscription}
                      >
                        Revoke Premium
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── TAB 4: DANGER ZONE ── */}
        <TabsContent value="danger" className="space-y-4">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Administrative actions that affect account access and identity.
          </p>

          {/* Edit display name */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-3 flex items-center gap-2">
                <User className="h-4 w-4 text-stone-500" />
                Edit Display Name
              </h3>
              <div className="flex gap-2">
                <Input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Enter display name"
                  className="max-w-xs"
                  onKeyDown={e => { if (e.key === 'Enter') handleUpdateName() }}
                />
                <Button
                  variant="outline"
                  onClick={handleUpdateName}
                  disabled={loading !== null || !editName.trim() || editName.trim() === details.profile.display_name}
                >
                  {loading === 'name' ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Change role */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-1 flex items-center gap-2">
                <Shield className="h-4 w-4 text-stone-500" />
                Change Role
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
                Current role: <Badge variant={details.profile.role === 'admin' ? 'default' : 'outline'} className="ml-1 text-xs">{details.profile.role}</Badge>
              </p>
              <div className="flex gap-2">
                {details.profile.role === 'user' ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={loading !== null}>
                        <Shield className="h-3.5 w-3.5 mr-1" />
                        Promote to Admin
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Promote to Admin?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will grant <strong>{details.profile.email}</strong> full admin access to this panel. They will be able to manage all users, subscriptions, and platform settings.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleUpdateRole('admin')}>
                          Promote to Admin
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/40"
                        disabled={loading !== null}
                      >
                        <UserX className="h-3.5 w-3.5 mr-1" />
                        Demote to User
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Demote to Regular User?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove admin privileges from <strong>{details.profile.email}</strong>. They will no longer be able to access this admin panel.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleUpdateRole('user')}>
                          Demote to User
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Password reset */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-1 flex items-center gap-2">
                <Key className="h-4 w-4 text-stone-500" />
                Password Reset
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
                Send a password reset email to <strong>{details.profile.email}</strong>.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={loading !== null}>
                    <Mail className="h-3.5 w-3.5 mr-1" />
                    {loading === 'password' ? 'Sending…' : 'Send Reset Email'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Send Password Reset?</AlertDialogTitle>
                    <AlertDialogDescription>
                      A password reset link will be sent to <strong>{details.profile.email}</strong>.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePasswordReset}>
                      Send Reset Email
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Delete account */}
          <Card className="border-rose-300 dark:border-rose-800 bg-rose-50/30 dark:bg-rose-950/20">
            <CardContent className="pt-5 pb-5">
              <h3 className="font-semibold text-rose-700 dark:text-rose-400 mb-1 flex items-center gap-2">
                <UserX className="h-4 w-4" />
                Delete Account Permanently
              </h3>
              <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
                This will permanently delete <strong>{details.profile.email}</strong>&apos;s account and <strong>all associated data</strong>: entries, projects, tags, subscription, group memberships, support tickets, and more. This action <strong>cannot be undone</strong>.
              </p>
              <div className="space-y-2 mb-4">
                <Label className="text-xs text-stone-600 dark:text-stone-400">
                  Type the user&apos;s email to confirm deletion:
                </Label>
                <Input
                  value={deleteConfirmEmail}
                  onChange={e => setDeleteConfirmEmail(e.target.value)}
                  placeholder={details.profile.email}
                  className="max-w-sm border-rose-200 dark:border-rose-800 focus-visible:ring-rose-500"
                />
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={loading !== null || deleteConfirmEmail !== details.profile.email}
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    {loading === 'delete' ? 'Deleting…' : 'Permanently Delete Account'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-rose-600 dark:text-rose-400">
                      Final Confirmation — Delete Account?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      You are about to permanently delete <strong>{details.profile.email}</strong> and all their data. This is irreversible. Are you absolutely sure?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-rose-600 hover:bg-rose-700 text-white"
                      onClick={handleDeleteAccount}
                    >
                      Yes, Delete Forever
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
