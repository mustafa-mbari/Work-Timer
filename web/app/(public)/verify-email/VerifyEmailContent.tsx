'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

function isRateLimitError(message: string) {
  return (
    message.toLowerCase().includes('rate limit') ||
    message.toLowerCase().includes('too many') ||
    message.includes('429')
  )
}

export default function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function handleResend() {
    if (!email) {
      toast.error('No email address found. Please register again.')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
      toast.success('Verification email sent! Check your inbox.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resend verification email'
      toast.error(
        isRateLimitError(message)
          ? 'Too many attempts. Please wait a moment and try again.'
          : message
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center">
            <Mail className="w-8 h-8 text-indigo-500" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">
          Verify your email
        </h1>
        <p className="text-stone-500 dark:text-stone-400 mb-6">
          We&apos;ve sent a verification link to{' '}
          {email
            ? <strong className="text-stone-700 dark:text-stone-300">{email}</strong>
            : 'your email address'
          }.{' '}
          Click the link in the email to activate your account.
        </p>

        <Card className="text-left mb-5">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Didn&apos;t receive the email? Check your <strong>spam or junk</strong> folder first,
              then request a new link below.
            </p>
          </CardContent>
        </Card>

        <Button
          onClick={handleResend}
          disabled={loading || !email}
          variant="outline"
          className="w-full"
        >
          {loading ? 'Sending…' : 'Resend verification email'}
        </Button>

        <p className="text-sm text-stone-400 dark:text-stone-500 mt-4">
          Used the wrong email?{' '}
          <Link
            href="/register"
            className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 font-medium"
          >
            Start over
          </Link>
        </p>
      </div>
    </div>
  )
}
