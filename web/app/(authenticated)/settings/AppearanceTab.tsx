'use client'

import { useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTheme, type Theme } from '@/lib/theme'
import { cn } from '@/lib/utils'
const THEME_OPTIONS: { value: Theme; label: string; description: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', description: 'Clean white background', Icon: Sun },
  { value: 'dark',  label: 'Dark',  description: 'Easy on the eyes at night', Icon: Moon },
  { value: 'system', label: 'System', description: 'Follow your OS preference', Icon: Monitor },
]

export default function AppearanceTab() {
  const { theme, setTheme } = useTheme()
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to save')
      }
      toast.success('Appearance saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5 max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>
            Choose how Work Timer looks. Changes apply instantly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {THEME_OPTIONS.map(({ value, label, description, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all',
                  theme === value
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                    : 'border-stone-200 dark:border-[var(--dark-border)] hover:border-stone-300 dark:hover:border-stone-600'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  theme === value
                    ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                    : 'bg-stone-100 dark:bg-[var(--dark-elevated)] text-stone-500 dark:text-stone-400'
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className={cn(
                    'text-sm font-medium',
                    theme === value
                      ? 'text-indigo-700 dark:text-indigo-300'
                      : 'text-stone-700 dark:text-stone-300'
                  )}>
                    {label}
                  </p>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{description}</p>
                </div>
              </button>
            ))}
          </div>

          <p className="text-xs text-stone-400 dark:text-stone-500 pt-1">
            Your preference is saved in your browser. Click &ldquo;Save&rdquo; to also sync it to the extension.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'Saving…' : 'Save to extension'}
        </Button>
      </div>
    </div>
  )
}
