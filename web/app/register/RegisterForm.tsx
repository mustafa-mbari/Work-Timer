'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

export default function RegisterForm() {
  const searchParams = useSearchParams()
  const isExtension = searchParams.get('ext') === 'true'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const redirectUrl = `${window.location.origin}/auth/callback${isExtension ? '?ext=true' : ''}`
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl },
      })
      if (error) throw error

      toast.success('Check your email to confirm your account!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleOAuth() {
    const redirectUrl = `${window.location.origin}/auth/callback${isExtension ? '?ext=true' : ''}`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl },
    })
  }

  // Password strength indicator
  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 8 ? 2 : 3
  const strengthLabel = ['', 'Weak', 'Fair', 'Strong']
  const strengthColor = ['', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500']

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Create your account</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            {isExtension ? 'Sign up to sync your time data across devices' : 'Get started with Work Timer'}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                />
                {password.length > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1 rounded-full bg-stone-200 dark:bg-[var(--dark-elevated)] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${strengthColor[strength]}`}
                        style={{ width: `${(strength / 3) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-stone-500 dark:text-stone-400">{strengthLabel[strength]}</span>
                  </div>
                )}
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Creating account...' : 'Sign up'}
              </Button>
            </form>

            <div className="relative my-4">
              <Separator />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-white dark:bg-[var(--dark-card)] px-2 text-xs text-stone-500 dark:text-stone-400">
                  Or continue with
                </span>
              </div>
            </div>

            <Button variant="outline" onClick={handleGoogleOAuth} className="w-full">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-stone-500 dark:text-stone-400 mt-4">
          Already have an account?{' '}
          <Link href={`/login${isExtension ? '?ext=true' : ''}`} className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 font-medium">
            Sign in
          </Link>
        </p>

        <p className="text-xs text-stone-400 dark:text-stone-500 text-center mt-6">
          By signing up, you agree to our{' '}
          <Link href="/terms" className="hover:text-stone-600 dark:hover:text-stone-300">Terms</Link>
          {' '}and{' '}
          <Link href="/privacy" className="hover:text-stone-600 dark:hover:text-stone-300">Privacy Policy</Link>
        </p>
      </div>
    </div>
  )
}
