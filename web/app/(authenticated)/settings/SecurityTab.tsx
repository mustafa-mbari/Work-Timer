'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userEmail: string
}

export default function SecurityTab({ userEmail }: Props) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
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
    <div className="space-y-5 max-w-xl">
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
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Your current password"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
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
                type="password"
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
