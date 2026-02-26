'use client'

import { useState } from 'react'
import { Calendar, Save } from 'lucide-react'

interface Props {
  groupId: string
  currentFrequency: string | null
  currentDeadlineDay: number | null
  onSaved: () => void
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function ScheduleSettings({ groupId, currentFrequency, currentDeadlineDay, onSaved }: Props) {
  const [frequency, setFrequency] = useState<string | null>(currentFrequency)
  const [deadlineDay, setDeadlineDay] = useState<number | null>(currentDeadlineDay)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          share_frequency: frequency,
          share_deadline_day: deadlineDay,
        }),
      })
      if (res.ok) onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-4 w-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Share Schedule</h3>
        </div>

        <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
          Configure how often members should submit their time reports. When a schedule is set, open share requests are automatically created for each member.
        </p>

        {/* Enable/Disable */}
        <label className="flex items-center gap-3 mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={frequency !== null}
            onChange={(e) => {
              if (e.target.checked) {
                setFrequency('weekly')
                setDeadlineDay(4) // Friday
              } else {
                setFrequency(null)
                setDeadlineDay(null)
              }
            }}
            className="h-4 w-4 rounded border-stone-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-stone-700 dark:text-stone-200">Enable recurring share schedule</span>
        </label>

        {frequency !== null && (
          <div className="space-y-4 pl-7">
            {/* Frequency */}
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Frequency</label>
              <div className="flex gap-2">
                {(['daily', 'weekly', 'monthly'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => {
                      setFrequency(f)
                      if (f === 'daily') setDeadlineDay(null)
                      else if (f === 'weekly') setDeadlineDay(4) // Friday
                      else setDeadlineDay(28) // 28th of month
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      frequency === f
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                        : 'bg-white dark:bg-[var(--dark-elevated)] border-stone-200 dark:border-[var(--dark-border)] text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)]'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Deadline day */}
            {frequency === 'weekly' && (
              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Deadline day</label>
                <select
                  value={deadlineDay ?? 4}
                  onChange={(e) => setDeadlineDay(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-elevated)] text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  {DAYS_OF_WEEK.map((day, i) => (
                    <option key={i} value={i}>{day}</option>
                  ))}
                </select>
              </div>
            )}

            {frequency === 'monthly' && (
              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Deadline day of month</label>
                <select
                  value={deadlineDay ?? 28}
                  onChange={(e) => setDeadlineDay(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-elevated)] text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                  <option value={31}>Last day</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Save button */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving...' : 'Save Schedule'}
          </button>
        </div>
      </div>
    </div>
  )
}
