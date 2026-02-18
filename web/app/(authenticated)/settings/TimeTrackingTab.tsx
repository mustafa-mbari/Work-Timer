'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { UserSettingsFull, ReminderConfig } from '@/lib/repositories/userSettings'

interface Props {
  settings: UserSettingsFull | null
}

// Sensible defaults matching the extension defaults
const DEFAULTS = {
  working_days: 5,
  week_start_day: 1 as 0 | 1,
  daily_target: null as number | null,
  weekly_target: null as number | null,
  idle_timeout: 5,
  floating_timer_auto: false,
  pomodoro_config: {
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    sessionsBeforeLongBreak: 4,
    soundEnabled: true,
  },
  reminder: {
    enabled: true,
    dayOfWeek: 5,
    hour: 14,
    minute: 0,
  } as ReminderConfig,
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const IDLE_OPTIONS = [1, 5, 10, 15, 30, 60, 120]

export default function TimeTrackingTab({ settings }: Props) {
  const s: Partial<UserSettingsFull> = settings ?? {}

  const [workingDays, setWorkingDays] = useState(s.working_days ?? DEFAULTS.working_days)
  const [weekStart, setWeekStart] = useState<0 | 1>(s.week_start_day ?? DEFAULTS.week_start_day)
  const [dailyTarget, setDailyTarget] = useState(s.daily_target?.toString() ?? '')
  const [weeklyTarget, setWeeklyTarget] = useState(s.weekly_target?.toString() ?? '')
  const [idleTimeout, setIdleTimeout] = useState(s.idle_timeout ?? DEFAULTS.idle_timeout)
  const [floatingAuto, setFloatingAuto] = useState(s.floating_timer_auto ?? DEFAULTS.floating_timer_auto)

  const pc = s.pomodoro_config ?? DEFAULTS.pomodoro_config
  const [workMins, setWorkMins] = useState(pc.workMinutes)
  const [shortBreak, setShortBreak] = useState(pc.shortBreakMinutes)
  const [longBreak, setLongBreak] = useState(pc.longBreakMinutes)
  const [sessions, setSessions] = useState(pc.sessionsBeforeLongBreak)
  const [sound, setSound] = useState(pc.soundEnabled)

  const rem = s.reminder ?? DEFAULTS.reminder
  const [remEnabled, setRemEnabled] = useState(rem.enabled)
  const [remDay, setRemDay] = useState(rem.dayOfWeek)
  const [remHour, setRemHour] = useState(rem.hour)
  const [remMinute, setRemMinute] = useState(rem.minute)

  const [loading, setLoading] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const body = {
        working_days: workingDays,
        week_start_day: weekStart,
        daily_target: dailyTarget ? parseFloat(dailyTarget) : null,
        weekly_target: weeklyTarget ? parseFloat(weeklyTarget) : null,
        idle_timeout: idleTimeout,
        floating_timer_auto: floatingAuto,
        pomodoro_config: {
          workMinutes: workMins,
          shortBreakMinutes: shortBreak,
          longBreakMinutes: longBreak,
          sessionsBeforeLongBreak: sessions,
          soundEnabled: sound,
        },
        reminder: {
          enabled: remEnabled,
          dayOfWeek: remDay,
          hour: remHour,
          minute: remMinute,
        },
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
      toast.success('Settings saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5 max-w-xl">
      {/* Work schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Work schedule</CardTitle>
          <CardDescription>Configure your typical working week</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="workingDays">Working days per week</Label>
            <select
              id="workingDays"
              value={workingDays}
              onChange={e => setWorkingDays(Number(e.target.value))}
              className="w-full rounded-lg border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] px-3 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[1, 2, 3, 4, 5, 6, 7].map(d => (
                <option key={d} value={d}>{d} {d === 1 ? 'day' : 'days'}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Week starts on</Label>
            <div className="flex gap-3">
              {([1, 0] as const).map(val => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="weekStart"
                    value={val}
                    checked={weekStart === val}
                    onChange={() => setWeekStart(val)}
                    className="accent-indigo-500"
                  />
                  <span className="text-sm text-stone-700 dark:text-stone-300">
                    {val === 1 ? 'Monday' : 'Sunday'}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Targets */}
      <Card>
        <CardHeader>
          <CardTitle>Daily & weekly targets</CardTitle>
          <CardDescription>Set optional hour targets to track against</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="dailyTarget">Daily target (hours)</Label>
            <Input
              id="dailyTarget"
              type="number"
              value={dailyTarget}
              onChange={e => setDailyTarget(e.target.value)}
              min={0}
              max={24}
              step={0.5}
              placeholder="e.g. 8"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="weeklyTarget">Weekly target (hours)</Label>
            <Input
              id="weeklyTarget"
              type="number"
              value={weeklyTarget}
              onChange={e => setWeeklyTarget(e.target.value)}
              min={0}
              max={168}
              step={0.5}
              placeholder="e.g. 40"
            />
          </div>
        </CardContent>
      </Card>

      {/* Idle & floating timer */}
      <Card>
        <CardHeader>
          <CardTitle>Idle detection & floating timer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="idleTimeout">Idle timeout</Label>
            <select
              id="idleTimeout"
              value={idleTimeout}
              onChange={e => setIdleTimeout(Number(e.target.value))}
              className="w-full rounded-lg border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] px-3 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {IDLE_OPTIONS.map(m => (
                <option key={m} value={m}>{m} {m === 1 ? 'minute' : 'minutes'}</option>
              ))}
            </select>
            <p className="text-xs text-stone-400 dark:text-stone-500">
              Prompt to keep or discard time after this many minutes of inactivity
            </p>
          </div>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Auto-show floating timer</p>
              <p className="text-xs text-stone-400 dark:text-stone-500">Show the mini timer widget on every page</p>
            </div>
            <input
              type="checkbox"
              role="switch"
              checked={floatingAuto}
              onChange={e => setFloatingAuto(e.target.checked)}
              className="w-10 h-5 rounded-full appearance-none bg-stone-200 dark:bg-stone-700 checked:bg-indigo-500 transition-colors cursor-pointer relative"
              style={{ WebkitAppearance: 'none' }}
            />
          </label>
        </CardContent>
      </Card>

      {/* Pomodoro */}
      <Card>
        <CardHeader>
          <CardTitle>Pomodoro timer</CardTitle>
          <CardDescription>Customize session and break durations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="workMins">Work session (min)</Label>
              <Input
                id="workMins"
                type="number"
                value={workMins}
                onChange={e => setWorkMins(Number(e.target.value))}
                min={1}
                max={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shortBreak">Short break (min)</Label>
              <Input
                id="shortBreak"
                type="number"
                value={shortBreak}
                onChange={e => setShortBreak(Number(e.target.value))}
                min={1}
                max={60}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="longBreak">Long break (min)</Label>
              <Input
                id="longBreak"
                type="number"
                value={longBreak}
                onChange={e => setLongBreak(Number(e.target.value))}
                min={1}
                max={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sessions">Sessions before long break</Label>
              <Input
                id="sessions"
                type="number"
                value={sessions}
                onChange={e => setSessions(Number(e.target.value))}
                min={1}
                max={10}
              />
            </div>
          </div>

          <label className="flex items-center justify-between cursor-pointer pt-1">
            <div>
              <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Sound notifications</p>
              <p className="text-xs text-stone-400 dark:text-stone-500">Play a sound when each phase ends</p>
            </div>
            <input
              type="checkbox"
              role="switch"
              checked={sound}
              onChange={e => setSound(e.target.checked)}
              className="w-10 h-5 rounded-full appearance-none bg-stone-200 dark:bg-stone-700 checked:bg-indigo-500 transition-colors cursor-pointer"
              style={{ WebkitAppearance: 'none' }}
            />
          </label>
        </CardContent>
      </Card>

      {/* Weekly reminder */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly reminder</CardTitle>
          <CardDescription>Get a nudge to log your time if you haven&apos;t recently</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Enable reminders</p>
            <input
              type="checkbox"
              role="switch"
              checked={remEnabled}
              onChange={e => setRemEnabled(e.target.checked)}
              className="w-10 h-5 rounded-full appearance-none bg-stone-200 dark:bg-stone-700 checked:bg-indigo-500 transition-colors cursor-pointer"
              style={{ WebkitAppearance: 'none' }}
            />
          </label>

          {remEnabled && (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="remDay">Day</Label>
                <select
                  id="remDay"
                  value={remDay}
                  onChange={e => setRemDay(Number(e.target.value))}
                  className="w-full rounded-lg border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] px-3 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {DAYS_OF_WEEK.map((d, i) => (
                    <option key={i} value={i}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="remHour">Hour (0–23)</Label>
                <Input
                  id="remHour"
                  type="number"
                  value={remHour}
                  onChange={e => setRemHour(Number(e.target.value))}
                  min={0}
                  max={23}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="remMinute">Minute</Label>
                <select
                  id="remMinute"
                  value={remMinute}
                  onChange={e => setRemMinute(Number(e.target.value))}
                  className="w-full rounded-lg border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] px-3 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {[0, 15, 30, 45].map(m => (
                    <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
