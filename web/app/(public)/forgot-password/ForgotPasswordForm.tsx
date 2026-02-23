'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

function isRateLimitError(message: string) {
  return (
    message.toLowerCase().includes('rate limit') ||
    message.toLowerCase().includes('too many') ||
    message.includes('429')
  )
}

export default function ForgotPasswordForm() {
  const t = useTranslations('auth.forgotPassword')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send reset email')
      setSent(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email'
      setError(isRateLimitError(message) ? t('tooManyAttempts') : message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-12 h-12 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">
            {t('checkInbox')}
          </h1>
          <p className="text-stone-500 dark:text-stone-400 mb-6">
            {t('sentTo', { email })}
          </p>
          <p className="text-sm text-stone-400 dark:text-stone-500 mb-4">
            {t('didNotReceive')}{' '}
            <button
              onClick={() => { setSent(false); setError(null) }}
              className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 font-medium"
            >
              {t('tryAgain')}
            </button>
            .
          </p>
          <Link
            href="/login"
            className="text-sm text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 font-medium"
          >
            {t('backToSignIn')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
            {t('title')}
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            {t('subtitle')}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">{t('emailLabel')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder={t('emailPlaceholder')}
                />
              </div>

              {error && (
                <p className="text-sm text-rose-500 dark:text-rose-400">{error}</p>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? t('submitting') : t('submit')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-stone-500 dark:text-stone-400 mt-4">
          {t('rememberPassword')}{' '}
          <Link
            href="/login"
            className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 font-medium"
          >
            {t('backToSignIn')}
          </Link>
        </p>
      </div>
    </div>
  )
}
