'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { UserSettingsFull } from '@/lib/repositories/userSettings'

interface Props {
  settings: UserSettingsFull | null
}

const CURRENCIES = [
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'EUR', label: 'Euro (\u20AC)' },
  { code: 'GBP', label: 'British Pound (\u00A3)' },
  { code: 'CAD', label: 'Canadian Dollar (C$)' },
  { code: 'AUD', label: 'Australian Dollar (A$)' },
  { code: 'JPY', label: 'Japanese Yen (\u00A5)' },
  { code: 'CHF', label: 'Swiss Franc (CHF)' },
  { code: 'INR', label: 'Indian Rupee (\u20B9)' },
  { code: 'BRL', label: 'Brazilian Real (R$)' },
  { code: 'SEK', label: 'Swedish Krona (kr)' },
]

const selectCls = 'w-full rounded-lg border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] px-3 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-500'

export default function EarningsSettingsTab({ settings }: Props) {
  const [hourlyRate, setHourlyRate] = useState(
    settings?.default_hourly_rate?.toString() ?? ''
  )
  const [currency, setCurrency] = useState(settings?.currency ?? 'USD')
  const [loading, setLoading] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const body = {
        default_hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        currency,
      }
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to save')
      }
      toast.success('Earnings settings saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Default Hourly Rate</CardTitle>
          <CardDescription>
            Set your default rate for earnings calculations. Individual projects can override this.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="defaultRate">Hourly rate</Label>
              <Input
                id="defaultRate"
                type="number"
                value={hourlyRate}
                onChange={e => setHourlyRate(e.target.value)}
                min={0}
                max={10000}
                step={0.01}
                placeholder="e.g. 75.00"
              />
              <p className="text-xs text-stone-400 dark:text-stone-500">
                Used for projects without a specific rate
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className={selectCls}
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving\u2026' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
