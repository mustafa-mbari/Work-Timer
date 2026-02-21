'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { Database } from '@/lib/shared/types'

type Subscription = Pick<
  Database['public']['Tables']['subscriptions']['Row'],
  'plan' | 'status' | 'current_period_end' | 'cancel_at_period_end'
>
type Profile = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'display_name' | 'role'
>

interface Props {
  user: { id: string; email: string }
  profile: Profile | null
  subscription: Subscription | null
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  premium_monthly: 'Premium Monthly',
  premium_yearly: 'Premium Yearly',
  premium_lifetime: 'Premium Lifetime',
}

function getInitials(name: string | null, email: string) {
  return (name || email)
    .split(/[\s@]/)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('')
}

export default function ProfileTab({ user, profile, subscription }: Props) {
  const t = useTranslations('settings.profile')
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [loading, setLoading] = useState(false)

  const plan = subscription?.plan ?? 'free'
  const isPremium = plan !== 'free'
  const initials = getInitials(profile?.display_name ?? null, user.email)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: displayName.trim() || null }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to save')
      }
      toast.success(t('saved'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Avatar + plan badge */}
      <Card>
        <CardContent className="pt-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-300 text-xl font-semibold select-none flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-stone-900 dark:text-stone-100 truncate">
              {profile?.display_name ?? user.email}
            </p>
            <p className="text-sm text-stone-500 dark:text-stone-400 truncate">{user.email}</p>
            <Badge variant={isPremium ? 'success' : 'secondary'} className="mt-1.5">
              {PLAN_LABELS[plan] ?? 'Free'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Edit form */}
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="displayName">{t('displayName')}</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                maxLength={100}
                placeholder={t('displayNamePlaceholder')}
                autoComplete="name"
              />
              <p className="text-xs text-stone-400 dark:text-stone-500">{t('displayNameHint')}</p>
            </div>

            <div className="space-y-1.5">
              <Label>{t('email')}</Label>
              <Input value={user.email} disabled readOnly className="opacity-60 cursor-not-allowed" />
              <p className="text-xs text-stone-400 dark:text-stone-500">{t('emailHint')}</p>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? t('saving') : t('saveChanges')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
