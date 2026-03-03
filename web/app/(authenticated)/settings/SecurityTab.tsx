'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'

interface Props {
  userEmail: string
}

export default function SecurityTab({ userEmail }: Props) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirm) {
      setError('New passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }

    const hasUpper = /[A-Z]/.test(newPassword)
    const hasLower = /[a-z]/.test(newPassword)
    const hasNumber = /[0-9]/.test(newPassword)

    if (!hasUpper || !hasLower || !hasNumber) {
      setError('New password must include uppercase, lowercase and a number.')
      return
    }

    setLoading(true)
    try {
      // Step 1: Verify current password by attempting sign-in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      })
      if (verifyError) {
        setError('Current password is incorrect.')
        return
      }

      // Step 2: Update to new password
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError

      // Send password change confirmation email (fire-and-forget)
      fetch('/api/auth/password-changed', { method: 'POST' }).catch(() => {})

      toast.success('Password updated successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirm('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>
            You must enter your current password to set a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Current password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Your current password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
              />
              <PasswordStrengthIndicator password={newPassword} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input
                id="confirm"
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Repeat new password"
              />
            </div>

            {error && (
              <p className="text-sm text-rose-500 dark:text-rose-400">{error}</p>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? 'Updating…' : 'Update password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account security</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-stone-500 dark:text-stone-400 space-y-1">
          <p>Account: <span className="text-stone-700 dark:text-stone-300 font-medium">{userEmail}</span></p>
          <p className="text-xs">
            If you signed up with Google, you may not have a password set.
            Use the <a href="/forgot-password" className="text-indigo-500 hover:underline">forgot password</a> flow to create one.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
