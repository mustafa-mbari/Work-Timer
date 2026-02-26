'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import {
  Play, Pause, Square, Plus, ChevronDown, ChevronRight,
  Clock, Search, X, Check, ArrowRight, FlaskConical,
} from 'lucide-react'

// ─── MOCK DATA ──────────────────────────────────────────────────────────────

type Project = { id: string; name: string; color: string; defaultTagId: string | null; defaultTagName: string | null }
type Tag     = { id: string; name: string; color: string }
type Entry   = { id: string; date: string; startHour: number; endHour: number; durationMs: number; projectId: string | null; description: string; tags: string[]; type: 'stopwatch' | 'manual' | 'pomodoro' }

const MOCK_PROJECTS: Project[] = [
  { id: 'p1', name: 'Frontend',  color: '#6366f1', defaultTagId: 't1', defaultTagName: 'Billable' },
  { id: 'p2', name: 'Backend',   color: '#10b981', defaultTagId: null, defaultTagName: null },
  { id: 'p3', name: 'Design',    color: '#f59e0b', defaultTagId: 't2', defaultTagName: 'Design' },
  { id: 'p4', name: 'Meetings',  color: '#ef4444', defaultTagId: null, defaultTagName: null },
  { id: 'p5', name: 'Planning',  color: '#8b5cf6', defaultTagId: null, defaultTagName: null },
  { id: 'p6', name: 'Research',  color: '#06b6d4', defaultTagId: 't1', defaultTagName: 'Billable' },
]

const MOCK_TAGS: Tag[] = [
  { id: 't1', name: 'Billable', color: '#6366f1' },
  { id: 't2', name: 'Design',   color: '#f59e0b' },
  { id: 't3', name: 'Internal', color: '#10b981' },
]

const MOCK_ENTRIES: Entry[] = [
  { id: 'e1',  date: '2026-02-25', startHour: 9,     endHour: 11.5,  durationMs: 9000000,   projectId: 'p1', description: 'Implement dashboard components',   tags: ['t1'], type: 'stopwatch' },
  { id: 'e2',  date: '2026-02-25', startHour: 13,    endHour: 13.75, durationMs: 2700000,   projectId: 'p4', description: 'Daily standup & sprint planning',    tags: [],    type: 'manual'    },
  { id: 'e3',  date: '2026-02-24', startHour: 10.25, endHour: 11.5,  durationMs: 4500000,   projectId: 'p3', description: 'UI review and design feedback',       tags: ['t2'], type: 'manual'    },
  { id: 'e4',  date: '2026-02-24', startHour: 14,    endHour: 17,    durationMs: 10800000,  projectId: 'p2', description: 'Fix authentication bug in API',        tags: ['t1'], type: 'stopwatch' },
  { id: 'e5',  date: '2026-02-24', startHour: 17.5,  endHour: 18,    durationMs: 1800000,   projectId: 'p1', description: 'Code review for pull request #42',     tags: [],    type: 'manual'    },
  { id: 'e6',  date: '2026-02-23', startHour: 8.75,  endHour: 10.25, durationMs: 5400000,   projectId: 'p1', description: 'Write unit tests for API layer',       tags: ['t1'], type: 'stopwatch' },
  { id: 'e7',  date: '2026-02-23', startHour: 11,    endHour: 12,    durationMs: 3600000,   projectId: 'p5', description: 'Sprint planning & backlog grooming',    tags: [],    type: 'manual'    },
  { id: 'e8',  date: '2026-02-23', startHour: 15,    endHour: 15.5,  durationMs: 1800000,   projectId: 'p4', description: 'Team retrospective',                   tags: [],    type: 'pomodoro'  },
  { id: 'e9',  date: '2026-02-22', startHour: 9,     endHour: 10,    durationMs: 3600000,   projectId: 'p2', description: 'Database schema migration v2',          tags: ['t3'], type: 'stopwatch' },
  { id: 'e10', date: '2026-02-22', startHour: 10.5,  endHour: 14.5,  durationMs: 14400000,  projectId: 'p1', description: 'Refactor state management layer',       tags: ['t1'], type: 'stopwatch' },
]

const MOCK_WEEK_DAYS = [
  { label: 'Mon', totalMs: 28800000, targetMs: 28800000 },
  { label: 'Tue', totalMs: 27000000, targetMs: 28800000 },
  { label: 'Wed', totalMs: 18000000, targetMs: 28800000 },
  { label: 'Thu', totalMs: 11700000, targetMs: 28800000 },
  { label: 'Fri', totalMs: 34200000, targetMs: 28800000 },
  { label: 'Sat', totalMs: 11700000, targetMs: 0        },
  { label: 'Sun', totalMs: 0,        targetMs: 0        },
]

const HEATMAP_LEVELS = [0,0,1,0,2,3,1,0,0,2,4,1,0,0,1,2,0,3,1,0,0,0,2,1,3,2,0,0]
const HEATMAP_DATA   = Array.from({ length: 84 }, (_, i) => ({ i, level: HEATMAP_LEVELS[i % HEATMAP_LEVELS.length] as 0|1|2|3|4 }))

const DURATION_PRESETS = [
  { label: '15m', ms: 900000  },
  { label: '30m', ms: 1800000 },
  { label: '1h',  ms: 3600000 },
  { label: '2h',  ms: 7200000 },
  { label: '4h',  ms: 14400000 },
]

// ─── HELPERS ────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function formatHour(h: number): string {
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  const ampm = hh >= 12 ? 'PM' : 'AM'
  const disp = hh % 12 || 12
  return `${disp}:${mm.toString().padStart(2, '0')} ${ampm}`
}

function getProject(id: string | null | undefined): Project | undefined {
  return MOCK_PROJECTS.find(p => p.id === id)
}

function getDayLabel(dateStr: string): string {
  if (dateStr === '2026-02-25') return 'Today'
  if (dateStr === '2026-02-24') return 'Yesterday'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function groupByDate(entries: Entry[]) {
  const map = new Map<string, Entry[]>()
  for (const e of entries) {
    if (!map.has(e.date)) map.set(e.date, [])
    map.get(e.date)!.push(e)
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, es]) => ({
      date,
      label: getDayLabel(date),
      totalMs: es.reduce((s, e) => s + e.durationMs, 0),
      entries: es,
    }))
}

// ─── VARIANT PICKER ─────────────────────────────────────────────────────────

interface VariantPickerProps {
  count: number
  active: number
  onSelect: (n: number) => void
  labels?: string[]
}

function VariantPicker({ count, active, onSelect, labels }: VariantPickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <span className="text-xs font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wider">Variant</span>
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i + 1)}
          className={cn(
            'w-7 h-7 rounded-full text-xs font-semibold transition-all',
            active === i + 1
              ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/30'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
          )}
        >
          {i + 1}
        </button>
      ))}
      {labels && active >= 1 && active <= labels.length && (
        <span className="ml-1 text-sm font-medium text-stone-600 dark:text-stone-300">
          — {labels[active - 1]}
        </span>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 1 — ENTRIES LIST
// ════════════════════════════════════════════════════════════════════════════

function EntriesV1TimelineFeed() {
  const grouped = groupByDate(MOCK_ENTRIES)
  return (
    <div className="space-y-7">
      {grouped.map(day => (
        <div key={day.date}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">{day.label}</span>
              <span className="text-xs text-stone-400 dark:text-stone-500">{day.date}</span>
            </div>
            <Badge variant="secondary" className="text-xs">{formatDuration(day.totalMs)}</Badge>
          </div>
          <div className="space-y-2">
            {day.entries.map(entry => {
              const proj = getProject(entry.projectId)
              return (
                <div key={entry.id} className="flex items-stretch bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-xl overflow-hidden hover:shadow-sm transition-shadow cursor-pointer">
                  <div className="w-1 shrink-0" style={{ backgroundColor: proj?.color ?? '#d1d5db' }} />
                  <div className="flex items-center gap-4 px-4 py-3 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800 dark:text-stone-100 truncate">{entry.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {proj && <span className="text-xs text-stone-400 dark:text-stone-500">{proj.name}</span>}
                        <span className="text-stone-200 dark:text-stone-700">·</span>
                        <span className="text-xs text-stone-400 dark:text-stone-500">{formatHour(entry.startHour)} – {formatHour(entry.endHour)}</span>
                        {entry.type !== 'stopwatch' && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 capitalize">{entry.type}</Badge>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-stone-700 dark:text-stone-200 tabular-nums shrink-0">
                      {formatDuration(entry.durationMs)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function EntriesV2KanbanColumns() {
  const grouped = groupByDate(MOCK_ENTRIES)

  function Column({ title, dayGroups, accent }: { title: string; dayGroups: typeof grouped; accent: string }) {
    const entries = dayGroups.flatMap(g => g.entries)
    const total   = entries.reduce((s, e) => s + e.durationMs, 0)
    return (
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-3">
          <span className={cn('text-xs font-semibold uppercase tracking-wider', accent)}>{title}</span>
          {total > 0 && <span className="text-xs text-stone-400 dark:text-stone-500">{formatDuration(total)}</span>}
        </div>
        <div className="space-y-2">
          {entries.map(entry => {
            const proj = getProject(entry.projectId)
            return (
              <div key={entry.id} className="bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-xl p-3 hover:shadow-sm transition-shadow cursor-pointer">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: proj?.color ?? '#d1d5db' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 dark:text-stone-100 leading-snug line-clamp-2">{entry.description}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-stone-400 dark:text-stone-500">{formatHour(entry.startHour)}</span>
                      <span className="text-xs font-bold text-stone-600 dark:text-stone-300">{formatDuration(entry.durationMs)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          {entries.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-stone-100 dark:border-stone-800 h-24 flex items-center justify-center">
              <span className="text-xs text-stone-300 dark:text-stone-600">No entries</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  const [today, yesterday, ...earlier] = grouped
  return (
    <div className="flex gap-4">
      <Column title="Today"     dayGroups={today     ? [today]     : []} accent="text-indigo-500 dark:text-indigo-400" />
      <Column title="Yesterday" dayGroups={yesterday ? [yesterday] : []} accent="text-stone-500 dark:text-stone-400" />
      <Column title="Earlier"   dayGroups={earlier}                      accent="text-stone-400 dark:text-stone-500" />
    </div>
  )
}

function EntriesV3UltraMinimal() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const grouped = groupByDate(MOCK_ENTRIES)
  return (
    <div className="space-y-6">
      {grouped.map(day => (
        <div key={day.date}>
          <div className="flex items-center gap-3 mb-1 pb-2 border-b border-stone-100 dark:border-stone-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">{day.label}</span>
            <span className="flex-1" />
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">{formatDuration(day.totalMs)}</span>
          </div>
          <div>
            {day.entries.map(entry => {
              const proj    = getProject(entry.projectId)
              const isOpen  = expandedId === entry.id
              return (
                <div key={entry.id}>
                  <div
                    className="flex items-center gap-3 py-2.5 px-1 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/40 rounded-lg transition-colors group"
                    onClick={() => setExpandedId(isOpen ? null : entry.id)}
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: proj?.color ?? '#d1d5db' }} />
                    <span className="flex-1 text-sm text-stone-700 dark:text-stone-200 truncate">{entry.description}</span>
                    <span className="text-xs text-stone-400 dark:text-stone-500 opacity-0 group-hover:opacity-100 transition-opacity">{formatHour(entry.startHour)} – {formatHour(entry.endHour)}</span>
                    <span className="text-sm font-bold text-stone-700 dark:text-stone-200 tabular-nums">{formatDuration(entry.durationMs)}</span>
                  </div>
                  {isOpen && (
                    <div className="ml-5 mb-2 p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-100 dark:border-stone-800 space-y-2">
                      <div className="flex gap-2">
                        <Input defaultValue={entry.description} className="h-8 text-sm flex-1" />
                        <Button size="sm" variant="outline" className="h-8">Save</Button>
                        <Button size="sm" variant="ghost" className="h-8 text-rose-500" onClick={() => setExpandedId(null)}>Delete</Button>
                      </div>
                      <p className="text-xs text-stone-400 dark:text-stone-500">{proj?.name ?? 'No project'} · {formatHour(entry.startHour)} – {formatHour(entry.endHour)}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function EntriesV4GanttBars() {
  const grouped = groupByDate(MOCK_ENTRIES)
  const hours   = [6, 8, 10, 12, 14, 16, 18, 20]
  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Hour ruler */}
        <div className="flex ml-[72px] relative h-5">
          {hours.map(h => (
            <div key={h} className="absolute text-[10px] text-stone-400 dark:text-stone-500 -translate-x-1/2" style={{ left: `${(h / 24) * 100}%` }}>
              {h}:00
            </div>
          ))}
        </div>
        {grouped.map(day => (
          <div key={day.date} className="flex items-center gap-3">
            <div className="w-[60px] shrink-0 text-right">
              <div className="text-xs font-semibold text-stone-600 dark:text-stone-300">{day.label}</div>
              <div className="text-[10px] text-stone-400 dark:text-stone-500">{formatDuration(day.totalMs)}</div>
            </div>
            <div className="flex-1 relative h-9 bg-stone-50 dark:bg-stone-800/50 rounded-lg overflow-hidden border border-stone-100 dark:border-stone-800">
              {hours.map(h => (
                <div key={h} className="absolute top-0 bottom-0 w-px bg-stone-200 dark:bg-stone-700/40" style={{ left: `${(h / 24) * 100}%` }} />
              ))}
              {day.entries.map(entry => {
                const proj  = getProject(entry.projectId)
                const left  = (entry.startHour / 24) * 100
                const width = ((entry.endHour - entry.startHour) / 24) * 100
                return (
                  <Tooltip key={entry.id}>
                    <TooltipTrigger asChild>
                      <div
                        className="absolute top-1.5 bottom-1.5 rounded-md cursor-pointer hover:brightness-110 transition-all"
                        style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%`, backgroundColor: proj?.color ?? '#d1d5db', minWidth: '6px' }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px]">
                      <p className="font-medium text-xs">{entry.description}</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">{formatHour(entry.startHour)} – {formatHour(entry.endHour)} · {formatDuration(entry.durationMs)}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </TooltipProvider>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 2 — TIMER WIDGET
// ════════════════════════════════════════════════════════════════════════════

function TimerV1BigButton() {
  const [running, setRunning] = useState<'idle' | 'running' | 'paused'>('idle')
  const [desc,    setDesc]    = useState('')
  const [projId,  setProjId]  = useState<string | null>(null)

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {running === 'idle' ? (
        <Button
          className="w-full h-16 text-base font-semibold gap-3 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
          onClick={() => setRunning('running')}
        >
          <Play className="h-5 w-5" /> Start Timer
        </Button>
      ) : (
        <div className="w-full bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('w-2 h-2 rounded-full', running === 'running' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400')} />
              <span className="text-2xl font-mono font-bold text-stone-800 dark:text-stone-100 tabular-nums">01:23:45</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setRunning(running === 'running' ? 'paused' : 'running')}>
                {running === 'running' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button size="sm" variant="outline" className="text-rose-500 border-rose-200 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950" onClick={() => setRunning('idle')}>
                <Square className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {desc && <p className="mt-2 text-xs text-stone-500 dark:text-stone-400 truncate">{desc}</p>}
        </div>
      )}

      <Input
        placeholder="What are you working on?"
        value={desc}
        onChange={e => setDesc(e.target.value)}
        className="h-10"
      />

      <div className="flex flex-wrap gap-2">
        {MOCK_PROJECTS.map(p => (
          <button
            key={p.id}
            onClick={() => setProjId(projId === p.id ? null : p.id)}
            className={cn(
              'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all',
              projId === p.id
                ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600'
            )}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
          </button>
        ))}
      </div>
    </div>
  )
}

function TimerV2CommandBar() {
  const [running, setRunning] = useState(false)
  const [input,   setInput]   = useState('')
  const [projId,  setProjId]  = useState<string>('p1')
  const proj = MOCK_PROJECTS.find(p => p.id === projId)

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      <div className={cn(
        'flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-300',
        running
          ? 'bg-indigo-500 border-indigo-400 shadow-lg shadow-indigo-500/30'
          : 'bg-white dark:bg-[var(--dark-card)] border-stone-200 dark:border-[var(--dark-border)] shadow-sm'
      )}>
        <button
          className={cn(
            'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full shrink-0 transition-all',
            running ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
          )}
          onClick={() => {
            const idx = MOCK_PROJECTS.findIndex(p => p.id === projId)
            setProjId(MOCK_PROJECTS[(idx + 1) % MOCK_PROJECTS.length].id)
          }}
        >
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: proj?.color }} />
          {proj?.name}
        </button>

        <input
          className={cn(
            'flex-1 bg-transparent outline-none text-sm',
            running ? 'text-white placeholder-white/60' : 'text-stone-700 dark:text-stone-200 placeholder-stone-400'
          )}
          placeholder={running ? 'Working on...' : 'What are you working on? Press Enter to start…'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') setRunning(true) }}
        />

        {running ? (
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-mono text-sm font-bold text-white tabular-nums">01:23:45</span>
            <button
              className="bg-white/20 hover:bg-white/30 rounded-xl px-2.5 py-1 text-xs text-white font-medium transition-colors"
              onClick={() => { setRunning(false); setInput('') }}
            >
              Stop
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-stone-400 dark:text-stone-500 hidden sm:block">↵ Enter</span>
            <button
              className="bg-indigo-500 hover:bg-indigo-600 rounded-xl w-8 h-8 flex items-center justify-center text-white transition-colors"
              onClick={() => setRunning(true)}
            >
              <Play className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {running && (
        <div className="flex items-center gap-2 px-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-stone-500 dark:text-stone-400">Timer running — click Stop to finish</span>
        </div>
      )}
    </div>
  )
}

function TimerV3TwoStep() {
  const [step,   setStep]   = useState<1 | 2>(1)
  const [desc,   setDesc]   = useState('')
  const [projId, setProjId] = useState<string | null>(null)
  const [mode,   setMode]   = useState<'stopwatch' | 'manual' | 'pomodoro'>('stopwatch')

  const MODES = [
    { id: 'stopwatch' as const, label: 'Stopwatch', sub: 'Track time as you work',    icon: '⏱' },
    { id: 'manual'    as const, label: 'Manual',    sub: 'Log time after the fact',   icon: '✏️' },
    { id: 'pomodoro'  as const, label: 'Pomodoro',  sub: '25-minute focus sessions',  icon: '🍅' },
  ]

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-2xl p-6 shadow-sm space-y-5">
        {/* Step bar */}
        <div className="flex items-center gap-2">
          {([1, 2] as const).map(s => (
            <div key={s} className={cn('flex items-center gap-1.5', s === step ? 'opacity-100' : 'opacity-40')}>
              <div className={cn(
                'w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center transition-colors',
                s < step ? 'bg-emerald-500 text-white' : s === step ? 'bg-indigo-500 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-500'
              )}>
                {s < step ? <Check className="h-3 w-3" /> : s}
              </div>
              <span className="text-xs text-stone-500 dark:text-stone-400">
                {s === 1 ? 'Task & project' : 'How to track'}
              </span>
              {s < 2 && <ChevronRight className="h-3 w-3 text-stone-300 dark:text-stone-600" />}
            </div>
          ))}
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 block">What are you working on?</label>
              <Input placeholder="e.g. Fix login bug" value={desc} onChange={e => setDesc(e.target.value)} className="h-10" />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-2 block">Project (optional)</label>
              <div className="flex flex-wrap gap-2">
                {MOCK_PROJECTS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setProjId(projId === p.id ? null : p.id)}
                    className={cn(
                      'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all',
                      projId === p.id
                        ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-stone-300'
                    )}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full gap-2 bg-indigo-500 hover:bg-indigo-600 text-white" onClick={() => setStep(2)}>
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                    mode === m.id
                      ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800/40'
                  )}
                >
                  <span className="text-xl">{m.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-stone-800 dark:text-stone-100">{m.label}</div>
                    <div className="text-xs text-stone-400 dark:text-stone-500">{m.sub}</div>
                  </div>
                  {mode === m.id && <Check className="h-4 w-4 text-indigo-500 shrink-0" />}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white gap-2">
                <Play className="h-4 w-4" /> Start
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TimerV4ModePills() {
  const [mode,    setMode]    = useState<'S' | 'M' | 'P'>('S')
  const [running, setRunning] = useState(false)
  const todayMs  = 11700000
  const targetMs = 28800000
  const progress = Math.min((todayMs / targetMs) * 100, 100)

  return (
    <div className="max-w-sm mx-auto">
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-2xl p-5 shadow-sm space-y-4">
        {/* Mode pills */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-stone-100 dark:bg-stone-800 rounded-xl p-1">
            {(['S', 'M', 'P'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  'w-9 h-7 rounded-lg text-xs font-bold transition-all',
                  mode === m ? 'bg-white dark:bg-stone-600 text-stone-800 dark:text-stone-100 shadow-sm' : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <span className="text-xs text-stone-400 dark:text-stone-500">
            {mode === 'S' ? 'Stopwatch' : mode === 'M' ? 'Manual entry' : 'Pomodoro 25m'}
          </span>
        </div>

        {/* Clock */}
        <div className="text-center py-2">
          <span className={cn('font-mono font-bold tabular-nums text-5xl transition-colors', running ? 'text-indigo-500 dark:text-indigo-400' : 'text-stone-800 dark:text-stone-100')}>
            {running ? '01:23:45' : '00:00:00'}
          </span>
        </div>

        {/* Inputs */}
        <Input placeholder="What are you working on?" className="h-9 text-sm" />
        <div className="flex flex-wrap gap-1.5">
          {MOCK_PROJECTS.slice(0, 4).map(p => (
            <span key={p.id} className="flex items-center gap-1 text-xs px-2 py-0.5 bg-stone-100 dark:bg-stone-800 rounded-full text-stone-500 dark:text-stone-400 cursor-pointer hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name}
            </span>
          ))}
        </div>

        {/* Action button */}
        <Button
          className={cn('w-full gap-2 font-semibold rounded-xl transition-all', running ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-indigo-500 hover:bg-indigo-600 text-white')}
          onClick={() => setRunning(!running)}
        >
          {running ? <><Square className="h-4 w-4" /> Stop</> : <><Play className="h-4 w-4" /> Start</>}
        </Button>

        {/* Daily progress */}
        <div className="pt-3 border-t border-stone-100 dark:border-stone-800">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-stone-400 dark:text-stone-500">Today</span>
            <span className="text-[10px] font-medium text-stone-500 dark:text-stone-400">{formatDuration(todayMs)} / {formatDuration(targetMs)}</span>
          </div>
          <div className="h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}

// V5 — Three Mode Cards (all visible simultaneously, click to activate)
function TimerV5ThreeModeCards() {
  const [activeMode, setActiveMode] = useState<'stopwatch' | 'manual' | 'pomodoro'>('stopwatch')
  const [running,    setRunning]    = useState(false)
  const [desc,       setDesc]       = useState('')
  const [projId,     setProjId]     = useState<string | null>(null)

  type ModeId = 'stopwatch' | 'manual' | 'pomodoro'
  const CARDS: { id: ModeId; icon: string; label: string; accentBorder: string; accentBg: string; accentBtn: string; accentBadge: string }[] = [
    { id: 'stopwatch', icon: '⏱', label: 'Stopwatch',    accentBorder: 'border-indigo-300 dark:border-indigo-700', accentBg: 'bg-indigo-50 dark:bg-indigo-900/20',    accentBtn: 'bg-indigo-500 hover:bg-indigo-600',  accentBadge: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' },
    { id: 'manual',    icon: '✏️', label: 'Manual Entry', accentBorder: 'border-emerald-300 dark:border-emerald-700', accentBg: 'bg-emerald-50 dark:bg-emerald-900/20', accentBtn: 'bg-emerald-500 hover:bg-emerald-600', accentBadge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
    { id: 'pomodoro',  icon: '🍅', label: 'Pomodoro',     accentBorder: 'border-rose-300 dark:border-rose-700',     accentBg: 'bg-rose-50 dark:bg-rose-900/20',      accentBtn: 'bg-rose-500 hover:bg-rose-600',      accentBadge: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'       },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <p className="text-xs text-stone-400 dark:text-stone-500 text-center">All 3 modes side-by-side — click a card to activate it</p>

      <div className="grid grid-cols-3 gap-3">
        {CARDS.map(card => {
          const isActive  = activeMode === card.id
          const isRunning = running && isActive
          return (
            <div
              key={card.id}
              onClick={() => { setActiveMode(card.id); setRunning(false) }}
              className={cn(
                'rounded-2xl border-2 p-4 cursor-pointer transition-all duration-200 space-y-3',
                isActive
                  ? `${card.accentBg} ${card.accentBorder} shadow-md scale-[1.02]`
                  : 'bg-white dark:bg-[var(--dark-card)] border-stone-200 dark:border-stone-700 opacity-70 hover:opacity-90'
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">{card.icon}</span>
                  <span className="text-xs font-semibold text-stone-700 dark:text-stone-200">{card.label}</span>
                </div>
                {isActive && <Badge className={cn('text-[10px] border-0 py-0', card.accentBadge)}>Active</Badge>}
              </div>

              {/* Mode-specific body */}
              {card.id === 'stopwatch' && (
                <div className="text-center py-1">
                  <div className={cn('text-2xl font-mono font-bold tabular-nums', isRunning ? 'text-indigo-600 dark:text-indigo-400' : 'text-stone-700 dark:text-stone-200')}>
                    {isRunning ? '01:23:45' : '00:00:00'}
                  </div>
                  {isRunning && <div className="flex justify-center mt-1"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /></div>}
                </div>
              )}

              {card.id === 'manual' && (
                <div className="space-y-2" onClick={e => e.stopPropagation()}>
                  <div className="flex gap-1 items-center">
                    <Input type="time" defaultValue="09:00" className="h-7 text-xs flex-1 px-2" />
                    <span className="text-stone-300 text-xs">→</span>
                    <Input type="time" defaultValue="10:30" className="h-7 text-xs flex-1 px-2" />
                  </div>
                  <div className="text-center text-sm font-bold text-emerald-600 dark:text-emerald-400">1h 30m</div>
                </div>
              )}

              {card.id === 'pomodoro' && (
                <div className="text-center space-y-1.5">
                  <div className={cn('text-2xl font-mono font-bold tabular-nums', isRunning ? 'text-rose-600 dark:text-rose-400' : 'text-stone-700 dark:text-stone-200')}>
                    {isRunning ? '21:33' : '25:00'}
                  </div>
                  <div className="text-[10px] text-stone-400 dark:text-stone-500">{isRunning ? '🎯 Focus phase' : 'Ready to focus'}</div>
                  <div className="flex justify-center gap-1">
                    {[1,2,3,4].map(s => <div key={s} className={cn('w-2 h-2 rounded-full', s <= 1 ? 'bg-rose-400' : 'bg-stone-200 dark:bg-stone-700')} />)}
                  </div>
                </div>
              )}

              {/* Action (only on active card) */}
              {isActive && (
                <button
                  className={cn('w-full h-8 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all', card.accentBtn)}
                  onClick={e => { e.stopPropagation(); setRunning(!isRunning) }}
                >
                  {isRunning && card.id !== 'manual' ? <><Square className="h-3 w-3" /> Stop</> : <><Play className="h-3 w-3" /> {card.id === 'manual' ? 'Save Entry' : 'Start'}</>}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Shared inputs */}
      <div className="max-w-lg mx-auto flex gap-2">
        <Input placeholder="What are you working on?" value={desc} onChange={e => setDesc(e.target.value)} className="h-9 text-sm" />
        <select className="h-9 text-sm px-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 shrink-0 w-36" value={projId ?? ''} onChange={e => setProjId(e.target.value || null)}>
          <option value="">No project</option>
          {MOCK_PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
    </div>
  )
}

// V6 — Circular Ring Timer (ring meaning changes per mode)
function TimerV6RingTimer() {
  const [mode,      setMode]      = useState<'stopwatch' | 'manual' | 'pomodoro'>('stopwatch')
  const [running,   setRunning]   = useState(false)
  const [pomPhase,  setPomPhase]  = useState<'focus' | 'break'>('focus')
  const [pomSess,   setPomSess]   = useState(1)
  const [manualH,   setManualH]   = useState(1)
  const [manualM,   setManualM]   = useState(30)
  const [desc,      setDesc]      = useState('')

  const R = 70, CX = 90, CY = 90
  const circ = 2 * Math.PI * R

  const progress  = !running ? 0 : mode === 'stopwatch' ? 0.35 : mode === 'pomodoro' ? (pomPhase === 'focus' ? 0.14 : 0.6) : 1
  const ringColor = mode === 'stopwatch' ? '#6366f1' : mode === 'manual' ? '#10b981' : pomPhase === 'focus' ? '#ef4444' : '#10b981'

  const displayTime = mode === 'stopwatch'
    ? (running ? '01:23:45' : '00:00:00')
    : mode === 'pomodoro'
    ? (running ? (pomPhase === 'focus' ? '21:33' : '04:12') : pomPhase === 'focus' ? '25:00' : '05:00')
    : `${manualH}h ${String(manualM).padStart(2,'0')}m`

  const subLabel = mode === 'stopwatch'
    ? (running ? 'Recording' : 'Ready')
    : mode === 'pomodoro'
    ? (running ? (pomPhase === 'focus' ? '🎯 Focus' : '☕ Break') : `Session ${pomSess}`)
    : 'Duration'

  const MODES = [
    { id: 'stopwatch' as const, icon: '⏱', label: 'Stopwatch' },
    { id: 'manual'    as const, icon: '✏️', label: 'Manual'    },
    { id: 'pomodoro'  as const, icon: '🍅', label: 'Pomodoro'  },
  ]

  return (
    <div className="max-w-sm mx-auto">
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-2xl p-6 space-y-4">
        {/* Mode tabs */}
        <div className="flex gap-1 bg-stone-100 dark:bg-stone-800 rounded-xl p-1">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setRunning(false) }}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg transition-all',
                mode === m.id ? 'bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 shadow-sm' : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
              )}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>

        {/* Ring */}
        <div className="flex justify-center">
          <div className="relative">
            <svg width={180} height={180} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={CX} cy={CY} r={R} fill="none" strokeWidth={14} stroke="#f1f0ef" className="dark:stroke-stone-800" />
              <circle
                cx={CX} cy={CY} r={R} fill="none" strokeWidth={14} strokeLinecap="round"
                stroke={ringColor}
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - progress)}
                style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">{subLabel}</span>
              <span className="text-3xl font-mono font-bold tabular-nums text-stone-800 dark:text-stone-100">{displayTime}</span>
              {mode === 'pomodoro' && (
                <div className="flex gap-1.5 mt-1">
                  {[1,2,3,4].map(s => <div key={s} className={cn('w-2 h-2 rounded-full', s < pomSess ? 'bg-rose-500' : 'bg-stone-200 dark:bg-stone-700')} />)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mode-specific extra controls */}
        {mode === 'manual' && (
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-1">
              <button className="w-6 h-6 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-500 text-sm hover:bg-stone-200 dark:hover:bg-stone-700 flex items-center justify-center" onClick={() => setManualH(Math.max(0, manualH - 1))}>−</button>
              <span className="w-8 text-center text-sm font-mono font-bold text-stone-700 dark:text-stone-200">{manualH}h</span>
              <button className="w-6 h-6 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-500 text-sm hover:bg-stone-200 dark:hover:bg-stone-700 flex items-center justify-center" onClick={() => setManualH(manualH + 1)}>+</button>
            </div>
            <div className="flex items-center gap-1">
              <button className="w-6 h-6 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-500 text-sm hover:bg-stone-200 dark:hover:bg-stone-700 flex items-center justify-center" onClick={() => setManualM(Math.max(0, manualM - 15))}>−</button>
              <span className="w-10 text-center text-sm font-mono font-bold text-stone-700 dark:text-stone-200">{manualM}m</span>
              <button className="w-6 h-6 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-500 text-sm hover:bg-stone-200 dark:hover:bg-stone-700 flex items-center justify-center" onClick={() => setManualM((manualM + 15) % 60)}>+</button>
            </div>
          </div>
        )}

        {mode === 'pomodoro' && running && (
          <div className="flex justify-center">
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setPomPhase(p => p === 'focus' ? 'break' : 'focus'); setPomSess(s => s + 1) }}>
              Skip phase ›
            </Button>
          </div>
        )}

        <Input placeholder="What are you working on?" value={desc} onChange={e => setDesc(e.target.value)} className="h-9 text-sm" />

        <Button
          className={cn('w-full font-semibold gap-2 rounded-xl text-white', running
            ? 'bg-rose-500 hover:bg-rose-600'
            : mode === 'stopwatch' ? 'bg-indigo-500 hover:bg-indigo-600'
            : mode === 'manual'    ? 'bg-emerald-500 hover:bg-emerald-600'
            :                        'bg-rose-500 hover:bg-rose-600'
          )}
          onClick={() => setRunning(!running)}
        >
          {running && mode !== 'manual'
            ? <><Square className="h-4 w-4" /> {mode === 'pomodoro' ? 'End session' : 'Stop'}</>
            : <><Play   className="h-4 w-4" /> {mode === 'manual' ? 'Save Entry' : mode === 'pomodoro' ? 'Start focus' : 'Start'}</>
          }
        </Button>
      </div>
    </div>
  )
}

// V7 — Mode Dropdown + Minimal Bar
function TimerV7ModeDropdown() {
  const [mode,     setMode]     = useState<'stopwatch' | 'manual' | 'pomodoro'>('stopwatch')
  const [dropOpen, setDropOpen] = useState(false)
  const [running,  setRunning]  = useState(false)
  const [desc,     setDesc]     = useState('')

  const MODES = [
    { id: 'stopwatch' as const, icon: '⏱', label: 'Stopwatch',    sub: 'Track as you work',  color: '#6366f1' },
    { id: 'manual'    as const, icon: '✏️', label: 'Manual',       sub: 'Log past time',       color: '#10b981' },
    { id: 'pomodoro'  as const, icon: '🍅', label: 'Pomodoro',     sub: '25m focus sessions',  color: '#ef4444' },
  ]
  const current = MODES.find(m => m.id === mode)!

  return (
    <div className="max-w-lg mx-auto space-y-3">
      <p className="text-xs text-stone-400 dark:text-stone-500 text-center">Ultra-minimal single row — mode picker hides until needed</p>

      <div className="flex items-center gap-2 bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] rounded-2xl px-4 py-3 shadow-sm">
        {/* Mode selector dropdown */}
        <div className="relative shrink-0">
          <button
            className="flex items-center gap-1.5 text-sm font-semibold text-stone-700 dark:text-stone-200 pr-3 border-r border-stone-100 dark:border-stone-800 mr-2"
            onClick={() => setDropOpen(!dropOpen)}
          >
            <span>{current.icon}</span>
            <span>{current.label}</span>
            <ChevronDown className={cn('h-3.5 w-3.5 text-stone-400 transition-transform duration-200', dropOpen && 'rotate-180')} />
          </button>
          {dropOpen && (
            <div className="absolute top-full mt-2 left-0 z-20 bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] rounded-xl shadow-xl py-1 w-48">
              {MODES.map(m => (
                <button
                  key={m.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                  onClick={() => { setMode(m.id); setDropOpen(false); setRunning(false) }}
                >
                  <span className="text-xl">{m.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-stone-700 dark:text-stone-200">{m.label}</div>
                    <div className="text-[10px] text-stone-400">{m.sub}</div>
                  </div>
                  {mode === m.id && <Check className="h-3.5 w-3.5 text-indigo-500 ml-auto" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Timer display */}
        <span className="flex-1 text-xl font-mono font-bold tabular-nums text-center" style={{ color: running ? current.color : undefined }}>
          {mode === 'pomodoro' ? (running ? '21:33' : '25:00') : running ? '01:23:45' : '00:00:00'}
        </span>

        {/* Start/Stop */}
        <button
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-white text-sm font-semibold transition-all shrink-0"
          style={{ backgroundColor: running ? '#ef4444' : current.color }}
          onClick={() => setRunning(!running)}
        >
          {running ? <><Square className="h-3.5 w-3.5" /> Stop</> : <><Play className="h-3.5 w-3.5" /> Start</>}
        </button>
      </div>

      {/* Expandable details panel */}
      <div className="bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-100 dark:border-stone-800 p-4 space-y-3">
        <Input placeholder="What are you working on?" value={desc} onChange={e => setDesc(e.target.value)} className="h-9 text-sm" />

        {mode === 'manual' && (
          <div className="flex flex-wrap gap-2 items-center">
            <label className="text-xs text-stone-400 dark:text-stone-500 shrink-0">Time:</label>
            <Input type="time" defaultValue="09:00" className="h-8 text-sm w-28" />
            <span className="text-stone-300 dark:text-stone-600">→</span>
            <Input type="time" defaultValue="10:30" className="h-8 text-sm w-28" />
            <span className="text-xs font-semibold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-700 px-2 py-0.5 rounded-lg">1h 30m</span>
          </div>
        )}

        {mode === 'pomodoro' && (
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-stone-400 dark:text-stone-500">Focus</span>
              <span className="font-semibold text-stone-600 dark:text-stone-300">25m</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-stone-400 dark:text-stone-500">Break</span>
              <span className="font-semibold text-stone-600 dark:text-stone-300">5m</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-stone-400 dark:text-stone-500">Session</span>
              <div className="flex gap-1">{[1,2,3,4].map(s => <div key={s} className={cn('w-2 h-2 rounded-full', s === 1 ? 'bg-rose-500' : 'bg-stone-200 dark:bg-stone-700')} />)}</div>
            </div>
          </div>
        )}

        <select className="w-full h-9 text-sm px-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200">
          <option value="">No project</option>
          {MOCK_PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
    </div>
  )
}

// V8 — Accordion Mode Panels (one open at a time, shows all 3)
function TimerV8AccordionModes() {
  const [openMode,    setOpenMode]    = useState<'stopwatch' | 'manual' | 'pomodoro'>('stopwatch')
  const [runningMode, setRunningMode] = useState<'stopwatch' | 'manual' | 'pomodoro' | null>(null)
  const [pomSess,     setPomSess]     = useState(1)

  const PANELS = [
    { id: 'stopwatch' as const, icon: '⏱', label: 'Stopwatch',    desc: 'Start a timer and track time live',   color: '#6366f1', btnColor: 'bg-indigo-500 hover:bg-indigo-600',  iconBg: 'bg-indigo-100 dark:bg-indigo-900/30'  },
    { id: 'manual'    as const, icon: '✏️', label: 'Manual Entry', desc: 'Log time you already spent',          color: '#10b981', btnColor: 'bg-emerald-500 hover:bg-emerald-600', iconBg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { id: 'pomodoro'  as const, icon: '🍅', label: 'Pomodoro',     desc: '25-minute focused work sessions',     color: '#ef4444', btnColor: 'bg-rose-500 hover:bg-rose-600',       iconBg: 'bg-rose-100 dark:bg-rose-900/30'       },
  ]

  return (
    <div className="max-w-lg mx-auto space-y-2">
      <p className="text-xs text-stone-400 dark:text-stone-500 text-center mb-4">Three expandable panels — see all modes, open the one you need</p>

      {PANELS.map(panel => {
        const isOpen    = openMode === panel.id
        const isRunning = runningMode === panel.id
        return (
          <div key={panel.id} className={cn('bg-white dark:bg-[var(--dark-card)] border rounded-2xl overflow-hidden transition-all', isOpen ? 'border-stone-200 dark:border-[var(--dark-border)] shadow-sm' : 'border-stone-100 dark:border-stone-800')}>
            {/* Header (always visible) */}
            <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left" onClick={() => setOpenMode(panel.id)}>
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0', panel.iconBg)}>{panel.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-stone-700 dark:text-stone-200">{panel.label}</div>
                <div className="text-xs text-stone-400 dark:text-stone-500">{panel.desc}</div>
              </div>
              {isRunning && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: panel.color + '20', color: panel.color }}>
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: panel.color }} />
                  {panel.id === 'pomodoro' ? '21:33' : '01:23:45'}
                </div>
              )}
              <ChevronDown className={cn('h-4 w-4 text-stone-400 transition-transform duration-200 shrink-0', isOpen && 'rotate-180')} />
            </button>

            {/* Expanded content */}
            {isOpen && (
              <div className="px-4 pb-4 pt-3 space-y-3 border-t border-stone-50 dark:border-stone-800">
                {panel.id === 'stopwatch' && (
                  <div className="text-center text-4xl font-mono font-bold tabular-nums py-2 text-stone-800 dark:text-stone-100">
                    {isRunning ? '01:23:45' : '00:00:00'}
                  </div>
                )}
                {panel.id === 'manual' && (
                  <div className="flex flex-wrap gap-2 items-center py-1">
                    <Input type="date" defaultValue="2026-02-25" className="h-9 text-sm w-36" />
                    <Input type="time" defaultValue="09:00" className="h-9 text-sm w-28" />
                    <span className="text-stone-400 dark:text-stone-500">→</span>
                    <Input type="time" defaultValue="10:30" className="h-9 text-sm w-28" />
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-lg">1h 30m</span>
                  </div>
                )}
                {panel.id === 'pomodoro' && (
                  <div className="flex items-center gap-4 py-1">
                    <div className="text-4xl font-mono font-bold tabular-nums text-stone-800 dark:text-stone-100 flex-1">
                      {isRunning ? '21:33' : '25:00'}
                    </div>
                    <div className="text-right space-y-1">
                      <div className="flex gap-1.5 justify-end">
                        {[1,2,3,4].map(s => <div key={s} className={cn('w-3 h-3 rounded-full border-2', s < pomSess ? 'bg-rose-500 border-rose-500' : 'border-stone-200 dark:border-stone-700')} />)}
                      </div>
                      <div className="text-[10px] text-stone-400 dark:text-stone-500">Session {pomSess} / 4</div>
                      <div className="text-[10px] font-medium text-rose-500">🎯 Focus phase</div>
                    </div>
                  </div>
                )}

                <Input placeholder={panel.id === 'pomodoro' ? 'What will you focus on?' : 'What are you working on?'} className="h-9 text-sm" />

                <div className="flex gap-2">
                  <select className="flex-1 h-9 text-sm px-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                    <option value="">No project</option>
                    {MOCK_PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <Button
                    className={cn('h-9 px-5 text-sm font-semibold text-white', isRunning ? 'bg-rose-500 hover:bg-rose-600' : panel.btnColor)}
                    onClick={() => {
                      if (isRunning) { setRunningMode(null); if (panel.id === 'pomodoro') setPomSess(s => s + 1) }
                      else setRunningMode(panel.id)
                    }}
                  >
                    {isRunning ? 'Stop' : panel.id === 'manual' ? 'Save' : 'Start'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// V9 — Extension-Style Popup (mirrors the actual Chrome extension)
function TimerV9ExtensionPopup() {
  const [mode,     setMode]     = useState<'stopwatch' | 'manual' | 'pomodoro'>('stopwatch')
  const [running,  setRunning]  = useState(false)
  const [pomPhase, setPomPhase] = useState<'focus' | 'short' | 'long'>('focus')
  const [pomSess,  setPomSess]  = useState(0)
  const [desc,     setDesc]     = useState('')
  const [projId,   setProjId]   = useState<string | null>(null)

  const PHASE_TIME  = { focus: '25:00', short: '05:00', long: '15:00' }
  const PHASE_LABEL = { focus: '🎯 Focus', short: '☕ Short break', long: '🌿 Long break' }
  const PHASE_COLOR = { focus: 'text-rose-500 dark:text-rose-400', short: 'text-emerald-500 dark:text-emerald-400', long: 'text-emerald-600 dark:text-emerald-300' }

  const TABS = [
    { id: 'stopwatch' as const, label: 'Stopwatch' },
    { id: 'manual'    as const, label: 'Manual'    },
    { id: 'pomodoro'  as const, label: 'Pomodoro'  },
  ]

  return (
    <div className="max-w-[380px] mx-auto">
      <p className="text-xs text-stone-400 dark:text-stone-500 text-center mb-4">Extension-style popup — polished, compact, full-featured</p>
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] rounded-2xl overflow-hidden shadow-xl">
        {/* Mode tab bar */}
        <div className="flex bg-stone-50 dark:bg-stone-800/50 border-b border-stone-100 dark:border-stone-800">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => { setMode(t.id); setRunning(false) }}
              className={cn(
                'flex-1 py-2.5 text-xs font-semibold transition-all border-b-2',
                mode === t.id
                  ? 'text-indigo-600 dark:text-indigo-400 border-indigo-500 bg-white dark:bg-[var(--dark-card)]'
                  : 'text-stone-400 dark:text-stone-500 border-transparent hover:text-stone-600 dark:hover:text-stone-300'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-3">
          {/* ── STOPWATCH ── */}
          {mode === 'stopwatch' && (
            <>
              <div className="text-center py-3">
                <div className={cn('text-5xl font-mono font-black tabular-nums tracking-tight', running ? 'text-indigo-600 dark:text-indigo-400' : 'text-stone-800 dark:text-stone-100')}>
                  {running ? '01:23:45' : '00:00:00'}
                </div>
                {running && <p className="text-xs text-stone-400 dark:text-stone-500 mt-1.5">● Recording</p>}
              </div>

              <Input placeholder="What are you working on?" value={desc} onChange={e => setDesc(e.target.value)} className="h-10" />

              <div className="flex flex-wrap gap-1.5">
                {MOCK_PROJECTS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setProjId(projId === p.id ? null : p.id)}
                    className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-all', projId === p.id ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400')}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </button>
                ))}
              </div>

              <Button
                className={cn('w-full h-11 font-bold text-base rounded-xl gap-2 text-white', running ? 'bg-rose-500 hover:bg-rose-600' : 'bg-indigo-500 hover:bg-indigo-600')}
                onClick={() => setRunning(!running)}
              >
                {running ? <><Square className="h-4 w-4" /> Stop Timer</> : <><Play className="h-4 w-4" /> Start Timer</>}
              </Button>
            </>
          )}

          {/* ── MANUAL ── */}
          {mode === 'manual' && (
            <>
              <Input placeholder="What did you work on?" value={desc} onChange={e => setDesc(e.target.value)} className="h-10" />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider block mb-1">Start</label>
                  <Input type="time" defaultValue="09:00" className="h-9 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider block mb-1">End</label>
                  <Input type="time" defaultValue="11:00" className="h-9 text-sm" />
                </div>
              </div>

              <div className="flex items-center justify-between py-2.5 px-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl">
                <span className="text-sm text-stone-500 dark:text-stone-400">Duration</span>
                <span className="text-sm font-bold text-stone-700 dark:text-stone-200">2h 00m</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {MOCK_PROJECTS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setProjId(projId === p.id ? null : p.id)}
                    className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-all', projId === p.id ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400')}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </button>
                ))}
              </div>

              <Button className="w-full h-11 font-bold text-base rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white">
                Save Entry
              </Button>
            </>
          )}

          {/* ── POMODORO ── */}
          {mode === 'pomodoro' && (
            <>
              <div className={cn('text-center text-xs font-semibold uppercase tracking-wider py-1 px-3 rounded-full mx-auto w-fit', pomPhase === 'focus' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400')}>
                {PHASE_LABEL[pomPhase]}
              </div>

              <div className="text-center py-2">
                <div className={cn('text-5xl font-mono font-black tabular-nums', running ? PHASE_COLOR[pomPhase] : 'text-stone-800 dark:text-stone-100')}>
                  {running ? (pomPhase === 'focus' ? '21:33' : pomPhase === 'short' ? '04:12' : '13:05') : PHASE_TIME[pomPhase]}
                </div>
              </div>

              {/* Session dots */}
              <div className="flex justify-center gap-2">
                {[1,2,3,4].map(s => (
                  <div key={s} className={cn('w-3.5 h-3.5 rounded-full border-2 transition-colors', s <= pomSess ? 'bg-rose-500 border-rose-500' : 'border-stone-200 dark:border-stone-700')} />
                ))}
              </div>

              <Input placeholder="What will you focus on?" value={desc} onChange={e => setDesc(e.target.value)} className="h-9" />

              <div className="flex gap-2">
                <Button
                  className={cn('flex-1 h-11 font-bold rounded-xl gap-2 text-white', running ? 'bg-stone-500 hover:bg-stone-600' : 'bg-rose-500 hover:bg-rose-600')}
                  onClick={() => setRunning(!running)}
                >
                  {running ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> Start focus</>}
                </Button>
                {running && (
                  <Button variant="outline" className="h-11 px-3 text-xs font-semibold"
                    onClick={() => { setPomPhase(p => p === 'focus' ? 'short' : 'focus'); if (pomPhase === 'short') setPomSess(s => s + 1) }}>
                    Skip ›
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-center gap-4 text-[10px] text-stone-400 dark:text-stone-500">
                <span>Focus: 25m</span>
                <span>Short break: 5m</span>
                <span>Long break: 15m</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TIMER WIDGET — IMPROVED MODE CARD DESIGNS (sub-tab 2)
// ════════════════════════════════════════════════════════════════════════════

// Shared: colored tag chip multi-select
function TagChips({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {MOCK_TAGS.map(tag => {
        const active = selected.includes(tag.id)
        return (
          <button
            key={tag.id}
            onClick={() => onToggle(tag.id)}
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium transition-all border',
              active
                ? 'text-white border-transparent shadow-sm'
                : 'bg-white dark:bg-[var(--dark-elevated)] text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-500'
            )}
            style={active ? { backgroundColor: tag.color, borderColor: tag.color } : undefined}
          >
            {active && <Check className="h-2.5 w-2.5" />}
            {tag.name}
          </button>
        )
      })}
    </div>
  )
}

// Shared: hours + minutes number inputs for manual duration
function DurationInput({
  hours, minutes, onHoursChange, onMinutesChange,
}: { hours: number; minutes: number; onHoursChange: (h: number) => void; onMinutesChange: (m: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="number" min={0} max={23} value={hours}
        onChange={e => onHoursChange(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
        className="w-12 h-8 text-center text-sm font-mono font-semibold border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-[var(--dark-elevated)] text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
      <span className="text-xs text-stone-400 font-medium">h</span>
      <input
        type="number" min={0} max={59} value={minutes}
        onChange={e => onMinutesChange(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
        className="w-12 h-8 text-center text-sm font-mono font-semibold border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-[var(--dark-elevated)] text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
      <span className="text-xs text-stone-400 font-medium">m</span>
    </div>
  )
}

/**
 * Improved A — Full-Card Forms
 * All 3 mode cards side-by-side. Each card is self-contained with its own
 * description, project selector, tag chips, and (for manual) a duration input.
 * Inactive cards are dimmed; click any card to activate it.
 */
function TimerImprovedA() {
  const [activeMode, setActiveMode] = useState<'stopwatch' | 'manual' | 'pomodoro'>('stopwatch')
  const [running, setRunning] = useState(false)
  const [pmSession, setPmSession] = useState(1)

  // Per-mode form state
  const [swDesc, setSwDesc] = useState(''); const [swProj, setSwProj] = useState(''); const [swTags, setSwTags] = useState<string[]>([])
  const [mnDesc, setMnDesc] = useState(''); const [mnProj, setMnProj] = useState(''); const [mnTags, setMnTags] = useState<string[]>([])
  const [pmDesc, setPmDesc] = useState(''); const [pmProj, setPmProj] = useState(''); const [pmTags, setPmTags] = useState<string[]>([])
  const [mnDate, setMnDate] = useState('2026-02-25')
  const [mnStart, setMnStart] = useState('09:00'); const [mnEnd, setMnEnd] = useState('10:30')
  const [mnHours, setMnHours] = useState(1); const [mnMinutes, setMnMinutes] = useState(30)

  function toggleTag(id: string, which: 'sw' | 'mn' | 'pm') {
    const tog = (arr: string[]) => arr.includes(id) ? arr.filter(t => t !== id) : [...arr, id]
    if (which === 'sw') setSwTags(tog(swTags))
    else if (which === 'mn') setMnTags(tog(mnTags))
    else setPmTags(tog(pmTags))
  }

  const CARDS = [
    { id: 'stopwatch' as const, icon: '⏱', label: 'Stopwatch', accentBg: 'bg-indigo-50 dark:bg-indigo-900/20',   accentBorder: 'border-indigo-400 dark:border-indigo-600',   accentBtn: 'bg-indigo-500 hover:bg-indigo-600'  },
    { id: 'manual'    as const, icon: '✏️', label: 'Manual',    accentBg: 'bg-emerald-50 dark:bg-emerald-900/20', accentBorder: 'border-emerald-400 dark:border-emerald-600', accentBtn: 'bg-emerald-500 hover:bg-emerald-600' },
    { id: 'pomodoro'  as const, icon: '🍅', label: 'Pomodoro',  accentBg: 'bg-rose-50 dark:bg-rose-900/20',       accentBorder: 'border-rose-400 dark:border-rose-600',       accentBtn: 'bg-rose-500 hover:bg-rose-600'       },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <p className="text-xs text-stone-400 dark:text-stone-500 text-center mb-4">
        Each card is self-contained with its own project, tags, and duration — click to activate
      </p>
      <div className="grid grid-cols-3 gap-4">
        {CARDS.map(card => {
          const isActive  = activeMode === card.id
          const isRunning = running && isActive
          const desc = card.id === 'stopwatch' ? swDesc : card.id === 'manual' ? mnDesc : pmDesc
          const proj = card.id === 'stopwatch' ? swProj : card.id === 'manual' ? mnProj : pmProj
          const tags = card.id === 'stopwatch' ? swTags : card.id === 'manual' ? mnTags : pmTags
          const which = card.id === 'stopwatch' ? 'sw' : card.id === 'manual' ? 'mn' : 'pm' as 'sw' | 'mn' | 'pm'
          const setDesc = card.id === 'stopwatch' ? setSwDesc : card.id === 'manual' ? setMnDesc : setPmDesc
          const setProj = card.id === 'stopwatch' ? setSwProj : card.id === 'manual' ? setMnProj : setPmProj

          return (
            <div
              key={card.id}
              onClick={() => { if (!isActive) { setActiveMode(card.id); setRunning(false) } }}
              className={cn(
                'rounded-2xl border-2 p-4 transition-all duration-200 flex flex-col gap-3',
                isActive
                  ? `${card.accentBg} ${card.accentBorder}`
                  : 'bg-white dark:bg-[var(--dark-card)] border-stone-200 dark:border-stone-700 opacity-55 hover:opacity-80 cursor-pointer'
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">{card.icon}</span>
                  <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">{card.label}</span>
                </div>
                {isActive && <Badge className="text-[10px] border-0 py-0 bg-white/60 dark:bg-black/20 text-stone-600 dark:text-stone-300">Active</Badge>}
              </div>

              {/* Stopwatch display */}
              {card.id === 'stopwatch' && (
                <div className="text-center py-2">
                  <div className="text-3xl font-mono font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                    {isRunning ? '01:23:45' : '00:00:00'}
                  </div>
                  {isRunning && <div className="flex justify-center mt-1.5"><div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" /></div>}
                </div>
              )}

              {/* Manual inputs + duration */}
              {card.id === 'manual' && (
                <div className="space-y-2" onClick={e => e.stopPropagation()}>
                  <input type="date" value={mnDate} onChange={e => setMnDate(e.target.value)}
                    className="w-full h-8 text-xs px-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-[var(--dark-elevated)] text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                  <div className="flex gap-1 items-center">
                    <Input type="time" value={mnStart} onChange={e => setMnStart(e.target.value)} className="h-7 text-xs px-2 flex-1" />
                    <span className="text-stone-300 text-xs shrink-0">→</span>
                    <Input type="time" value={mnEnd} onChange={e => setMnEnd(e.target.value)} className="h-7 text-xs px-2 flex-1" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-500 dark:text-stone-400 shrink-0">Duration</span>
                    <DurationInput hours={mnHours} minutes={mnMinutes} onHoursChange={setMnHours} onMinutesChange={setMnMinutes} />
                  </div>
                </div>
              )}

              {/* Pomodoro display */}
              {card.id === 'pomodoro' && (
                <div className="text-center space-y-1.5" onClick={e => e.stopPropagation()}>
                  <div className="text-3xl font-mono font-bold tabular-nums text-rose-600 dark:text-rose-400">
                    {isRunning ? '21:33' : '25:00'}
                  </div>
                  <div className="text-[10px] text-stone-400 dark:text-stone-500">{isRunning ? '🎯 Focus phase' : 'Ready'}</div>
                  <div className="flex justify-center gap-1.5">
                    {[1,2,3,4].map(s => (
                      <div key={s} onClick={e => { e.stopPropagation(); setPmSession(s) }}
                        className={cn('w-2.5 h-2.5 rounded-full cursor-pointer', s <= pmSession ? 'bg-rose-400' : 'bg-stone-200 dark:bg-stone-700')} />
                    ))}
                  </div>
                </div>
              )}

              {/* Shared fields — only when active */}
              {isActive && (
                <div className="space-y-2 pt-2 border-t border-black/[.06] dark:border-white/[.06]" onClick={e => e.stopPropagation()}>
                  <Input placeholder="What are you working on?" value={desc} onChange={e => setDesc(e.target.value)} className="h-8 text-xs" />
                  <select value={proj} onChange={e => setProj(e.target.value)}
                    className="w-full h-8 text-xs px-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-[var(--dark-elevated)] text-stone-700 dark:text-stone-200 focus:outline-none">
                    <option value="">No project</option>
                    {MOCK_PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <TagChips selected={tags} onToggle={id => toggleTag(id, which)} />
                </div>
              )}

              {/* Action button — only on active card */}
              {isActive && (
                <button
                  className={cn('w-full h-9 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-1.5 mt-auto transition-all', card.accentBtn)}
                  onClick={e => { e.stopPropagation(); if (card.id !== 'manual') setRunning(!isRunning) }}
                >
                  {card.id === 'manual'
                    ? <><Check className="h-3.5 w-3.5" /> Save Entry</>
                    : isRunning
                    ? <><Square className="h-3.5 w-3.5" /> Stop</>
                    : <><Play className="h-3.5 w-3.5" /> Start</>}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Improved B — Unified Smart Form
 * Three compact mode cards at top to pick the mode. One adaptive form below
 * shows the timer display for the chosen mode, then shared description, project,
 * and tags. Manual mode shows date + time + duration inputs in the form body.
 */
function TimerImprovedB() {
  const [mode, setMode] = useState<'stopwatch' | 'manual' | 'pomodoro'>('stopwatch')
  const [running, setRunning] = useState(false)
  const [desc, setDesc] = useState('')
  const [projId, setProjId] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [mnDate, setMnDate] = useState('2026-02-25')
  const [mnStart, setMnStart] = useState('09:00'); const [mnEnd, setMnEnd] = useState('10:30')
  const [mnHours, setMnHours] = useState(1); const [mnMinutes, setMnMinutes] = useState(30)
  const [pmWork, setPmWork] = useState(25); const [pmBreak, setPmBreak] = useState(5); const [pmTarget, setPmTarget] = useState(4)

  function toggleTag(id: string) { setTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]) }

  const MODES = [
    { id: 'stopwatch' as const, icon: '⏱', label: 'Stopwatch' },
    { id: 'manual'    as const, icon: '✏️', label: 'Manual'    },
    { id: 'pomodoro'  as const, icon: '🍅', label: 'Pomodoro'  },
  ]
  const accentZone  = mode === 'stopwatch' ? 'bg-indigo-50 dark:bg-indigo-900/20'  : mode === 'manual' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-rose-50 dark:bg-rose-900/20'
  const accentBtn   = mode === 'stopwatch' ? 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/25' : mode === 'manual' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/25'
  const activePill  = mode === 'stopwatch' ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-400 text-indigo-700 dark:text-indigo-300' : mode === 'manual' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-400 text-rose-700 dark:text-rose-300'

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Mode selector row */}
      <div className="grid grid-cols-3 gap-2">
        {MODES.map(m => (
          <button key={m.id} onClick={() => { setMode(m.id); setRunning(false) }}
            className={cn(
              'flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all text-sm font-medium',
              mode === m.id ? activePill : 'bg-white dark:bg-[var(--dark-card)] border-stone-200 dark:border-stone-700 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
            )}
          >
            <span className="text-xl">{m.icon}</span>
            <span className="text-xs">{m.label}</span>
          </button>
        ))}
      </div>

      {/* Main form card */}
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] rounded-2xl p-5 space-y-4 shadow-sm">
        {/* Mode timer zone */}
        <div className={cn('rounded-xl p-4', accentZone)}>
          {mode === 'stopwatch' && (
            <div className="flex items-center justify-between">
              <span className="text-3xl font-mono font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                {running ? '01:23:45' : '00:00:00'}
              </span>
              {running && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />}
            </div>
          )}
          {mode === 'manual' && (
            <div className="space-y-3">
              <input type="date" value={mnDate} onChange={e => setMnDate(e.target.value)}
                className="w-full h-9 text-sm px-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[var(--dark-elevated)] text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-emerald-400" />
              <div className="flex gap-2 items-center">
                <Input type="time" value={mnStart} onChange={e => setMnStart(e.target.value)} className="h-9 text-sm flex-1" />
                <ArrowRight className="h-4 w-4 text-stone-300 shrink-0" />
                <Input type="time" value={mnEnd} onChange={e => setMnEnd(e.target.value)} className="h-9 text-sm flex-1" />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-stone-500 dark:text-stone-400 shrink-0">Duration</span>
                <DurationInput hours={mnHours} minutes={mnMinutes} onHoursChange={setMnHours} onMinutesChange={setMnMinutes} />
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 ml-auto">{mnHours}h {mnMinutes}m</span>
              </div>
            </div>
          )}
          {mode === 'pomodoro' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-mono font-bold tabular-nums text-rose-600 dark:text-rose-400">
                  {running ? '21:33' : `${String(pmWork).padStart(2,'0')}:00`}
                </span>
                <div className="flex gap-1">
                  {Array.from({ length: pmTarget }).map((_, i) => (
                    <div key={i} className={cn('w-2.5 h-2.5 rounded-full', i === 0 && running ? 'bg-rose-400' : 'bg-rose-200 dark:bg-rose-900/40')} />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[{ label: 'Work (min)', val: pmWork, set: setPmWork, max: 60, color: 'rose' }, { label: 'Break (min)', val: pmBreak, set: setPmBreak, max: 30, color: 'rose' }, { label: 'Sessions', val: pmTarget, set: setPmTarget, max: 8, color: 'rose' }].map(f => (
                  <div key={f.label} className="text-center">
                    <div className="text-stone-400 mb-1">{f.label}</div>
                    <input type="number" min={1} max={f.max} value={f.val} onChange={e => f.set(parseInt(e.target.value) || 1)}
                      className="w-full h-7 text-center font-semibold rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-[var(--dark-elevated)] text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-rose-400" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Shared fields */}
        <Input placeholder="What are you working on?" value={desc} onChange={e => setDesc(e.target.value)} className="h-10" />
        <select value={projId} onChange={e => setProjId(e.target.value)}
          className="w-full h-9 text-sm px-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-[var(--dark-elevated)] text-stone-700 dark:text-stone-200 focus:outline-none">
          <option value="">No project</option>
          {MOCK_PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div>
          <p className="text-xs text-stone-400 dark:text-stone-500 mb-1.5">Tags</p>
          <TagChips selected={tags} onToggle={toggleTag} />
        </div>
        <button onClick={() => mode !== 'manual' && setRunning(!running)}
          className={cn('w-full h-11 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-all text-sm shadow-lg', accentBtn)}>
          {mode === 'manual'
            ? <><Check className="h-4 w-4" /> Save Entry</>
            : running
            ? <><Square className="h-4 w-4" /> Stop</>
            : <><Play className="h-4 w-4" /> Start {mode === 'pomodoro' ? 'Pomodoro' : 'Timer'}</>}
        </button>
      </div>
    </div>
  )
}

/**
 * Improved C — Side-by-Side Panels
 * Left 2/3: the three modes as an accordion (one expanded at a time).
 * Right 1/3: shared description, project, and tag fields that always show.
 * Clean two-column professional layout with full mode content visible.
 */
function TimerImprovedC() {
  const [mode, setMode] = useState<'stopwatch' | 'manual' | 'pomodoro'>('stopwatch')
  const [running, setRunning] = useState(false)
  const [desc, setDesc] = useState('')
  const [projId, setProjId] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [mnDate, setMnDate] = useState('2026-02-25')
  const [mnStart, setMnStart] = useState('09:00'); const [mnEnd, setMnEnd] = useState('10:30')
  const [mnHours, setMnHours] = useState(1); const [mnMinutes, setMnMinutes] = useState(30)

  function toggleTag(id: string) { setTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]) }

  const PANELS = [
    { id: 'stopwatch' as const, icon: '⏱', label: 'Stopwatch',    openBg: 'bg-indigo-50 dark:bg-indigo-900/20',   btnCls: 'bg-indigo-500 hover:bg-indigo-600'  },
    { id: 'manual'    as const, icon: '✏️', label: 'Manual Entry', openBg: 'bg-emerald-50 dark:bg-emerald-900/20', btnCls: 'bg-emerald-500 hover:bg-emerald-600' },
    { id: 'pomodoro'  as const, icon: '🍅', label: 'Pomodoro',     openBg: 'bg-rose-50 dark:bg-rose-900/20',       btnCls: 'bg-rose-500 hover:bg-rose-600'       },
  ]

  return (
    <div className="max-w-3xl mx-auto flex gap-4 items-start">
      {/* Left: mode accordion */}
      <div className="flex-1 bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] rounded-2xl overflow-hidden shadow-sm divide-y divide-stone-100 dark:divide-[var(--dark-border)]">
        {PANELS.map(panel => {
          const isOpen = mode === panel.id
          const isRunning = running && isOpen
          return (
            <div key={panel.id}>
              <button
                onClick={() => { setMode(panel.id); setRunning(false) }}
                className={cn(
                  'w-full flex items-center justify-between px-5 py-3.5 transition-colors text-left',
                  isOpen ? panel.openBg : 'hover:bg-stone-50 dark:hover:bg-[var(--dark-elevated)]'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span>{panel.icon}</span>
                  <span className={cn('text-sm font-semibold', isOpen ? 'text-stone-800 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400')}>
                    {panel.label}
                  </span>
                  {isRunning && (
                    <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      {panel.id === 'pomodoro' ? '21:33' : '01:23:45'}
                    </span>
                  )}
                </div>
                <ChevronDown className={cn('h-4 w-4 text-stone-400 transition-transform duration-200', isOpen ? 'rotate-180' : '')} />
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-3 space-y-3">
                  {panel.id === 'stopwatch' && (
                    <div className="flex items-center gap-4">
                      <span className="text-4xl font-mono font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                        {isRunning ? '01:23:45' : '00:00:00'}
                      </span>
                      {isRunning && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />}
                    </div>
                  )}

                  {panel.id === 'manual' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs text-stone-400 dark:text-stone-500 font-medium">Date</label>
                        <input type="date" value={mnDate} onChange={e => setMnDate(e.target.value)}
                          className="w-full h-9 text-sm px-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-[var(--dark-elevated)] text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-stone-400 dark:text-stone-500 font-medium">Duration</label>
                        <DurationInput hours={mnHours} minutes={mnMinutes} onHoursChange={setMnHours} onMinutesChange={setMnMinutes} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-stone-400 dark:text-stone-500 font-medium">Start time</label>
                        <Input type="time" value={mnStart} onChange={e => setMnStart(e.target.value)} className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-stone-400 dark:text-stone-500 font-medium">End time</label>
                        <Input type="time" value={mnEnd} onChange={e => setMnEnd(e.target.value)} className="h-9 text-sm" />
                      </div>
                    </div>
                  )}

                  {panel.id === 'pomodoro' && (
                    <div className="flex items-center gap-6">
                      <span className="text-4xl font-mono font-bold tabular-nums text-rose-600 dark:text-rose-400">
                        {isRunning ? '21:33' : '25:00'}
                      </span>
                      <div className="space-y-1.5">
                        <div className="flex gap-1.5">
                          {[1,2,3,4].map(s => (
                            <div key={s} className={cn('w-3 h-3 rounded-full', s <= 1 && isRunning ? 'bg-rose-400' : 'bg-stone-200 dark:bg-stone-700')} />
                          ))}
                        </div>
                        <div className="text-xs text-stone-400 dark:text-stone-500">
                          {isRunning ? '🎯 Focus phase · 1 of 4' : 'Ready to focus'}
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => panel.id !== 'manual' && setRunning(!isRunning)}
                    className={cn('h-9 px-5 rounded-xl text-white text-sm font-semibold flex items-center gap-2 transition-all', panel.btnCls)}
                  >
                    {panel.id === 'manual'
                      ? <><Check className="h-4 w-4" /> Save Entry</>
                      : isRunning
                      ? <><Square className="h-4 w-4" /> Stop</>
                      : <><Play className="h-4 w-4" /> Start</>}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Right: shared fields */}
      <div className="w-60 bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] rounded-2xl p-4 space-y-3 shadow-sm shrink-0">
        <div>
          <label className="text-xs text-stone-400 dark:text-stone-500 font-medium block mb-1.5">Description</label>
          <Input placeholder="What are you working on?" value={desc} onChange={e => setDesc(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <label className="text-xs text-stone-400 dark:text-stone-500 font-medium block mb-1.5">Project</label>
          <select value={projId} onChange={e => setProjId(e.target.value)}
            className="w-full h-9 text-sm px-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-[var(--dark-elevated)] text-stone-700 dark:text-stone-200 focus:outline-none">
            <option value="">No project</option>
            {MOCK_PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-stone-400 dark:text-stone-500 font-medium block mb-1.5">Tags</label>
          <TagChips selected={tags} onToggle={toggleTag} />
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 6 — DAILY GOAL  (5 standard + 5 horizontal designs)
// ════════════════════════════════════════════════════════════════════════════

const GOAL_MS  = 28800000   // 8 h target
const TODAY_MS = 23400000   // 6 h 30 m worked today

function goalPct(worked: number, goal: number) { return Math.min(100, Math.round((worked / goal) * 100)) }
function goalRemaining(worked: number, goal: number) { return Math.max(0, goal - worked) }

// ── Standard (vertical) ─────────────────────────────────────────────────────

/**
 * V1 — Circular Arc Gauge
 * A large SVG arc ring with today's hours + % in the centre.
 * Editable goal input below. Colour changes from slate→indigo→emerald.
 */
function DailyGoalV1CircularArc() {
  const [goal, setGoal] = useState(8)
  const goalMs   = goal * 3600000
  const pct      = Math.min(100, (TODAY_MS / goalMs) * 100)
  const r = 80; const circ = 2 * Math.PI * r
  const filled   = circ * (pct / 100)
  const color    = pct >= 100 ? '#10b981' : pct >= 75 ? '#6366f1' : pct >= 50 ? '#f59e0b' : '#94a3b8'

  return (
    <div className="max-w-xs mx-auto text-center space-y-5">
      <div className="relative mx-auto" style={{ width: 200, height: 200 }}>
        <svg width={200} height={200} viewBox="0 0 200 200">
          <circle cx={100} cy={100} r={r} fill="none" strokeWidth={16} strokeLinecap="round"
            stroke="currentColor" className="text-stone-100 dark:text-stone-800" />
          <circle cx={100} cy={100} r={r} fill="none" strokeWidth={16} strokeLinecap="round"
            stroke={color}
            strokeDasharray={`${filled} ${circ - filled}`}
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dasharray 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span className="text-3xl font-bold tabular-nums text-stone-800 dark:text-stone-100">{formatDuration(TODAY_MS)}</span>
          <span className="text-xs text-stone-400 dark:text-stone-500">of {goal}h goal</span>
          <span className="text-lg font-semibold mt-0.5" style={{ color }}>{Math.round(pct)}%</span>
        </div>
      </div>

      {pct >= 100
        ? <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">🎉 Goal achieved!</p>
        : <p className="text-sm text-stone-500 dark:text-stone-400">{formatDuration(goalRemaining(TODAY_MS, goalMs))} remaining</p>}

      <div className="flex items-center justify-center gap-2">
        <span className="text-xs text-stone-400">Daily goal</span>
        <input type="number" min={1} max={16} value={goal} onChange={e => setGoal(parseInt(e.target.value) || 8)}
          className="w-14 h-8 text-center text-sm font-bold border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-[var(--dark-elevated)] text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        <span className="text-xs text-stone-400">h</span>
      </div>
    </div>
  )
}

/**
 * V2 — Segmented Hour Blocks
 * One block per hour of the goal. Blocks fill up as hours are completed.
 * The current (partial) hour shows proportional fill.
 */
function DailyGoalV2SegmentedBlocks() {
  const [goal, setGoal] = useState(8)
  const workedH = TODAY_MS / 3600000

  const segments = Array.from({ length: goal }, (_, i) => {
    if (workedH >= i + 1) return 1
    if (workedH > i) return workedH - i
    return 0
  })

  return (
    <div className="max-w-sm mx-auto space-y-5">
      <div className="text-center">
        <p className="text-3xl font-bold tabular-nums text-stone-800 dark:text-stone-100">{formatDuration(TODAY_MS)}</p>
        <p className="text-sm text-stone-400 dark:text-stone-500 mt-1">of {goal}h · {goalPct(TODAY_MS, goal * 3600000)}% complete</p>
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(goal, 8)}, 1fr)` }}>
        {segments.map((fill, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-xl overflow-hidden relative" style={{ height: 72 }}>
              <div
                className="absolute bottom-0 left-0 right-0 rounded-xl transition-all duration-500"
                style={{ height: `${fill * 100}%`, background: fill >= 1 ? '#6366f1' : fill > 0 ? 'linear-gradient(to top, #6366f1, #a5b4fc)' : 'transparent' }}
              />
              {fill >= 1 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
              )}
              {fill > 0 && fill < 1 && (
                <div className="absolute inset-0 flex items-end justify-center pb-1">
                  <span className="text-[9px] font-bold text-indigo-200">{Math.round(fill * 60)}m</span>
                </div>
              )}
            </div>
            <span className="text-[10px] text-stone-400 dark:text-stone-600">{i + 1}h</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2">
        <span className="text-xs text-stone-400">Goal</span>
        <input type="number" min={1} max={12} value={goal} onChange={e => setGoal(parseInt(e.target.value) || 8)}
          className="w-12 h-7 text-center text-xs font-bold border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-[var(--dark-elevated)] text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
        <span className="text-xs text-stone-400">h/day</span>
      </div>
    </div>
  )
}

/**
 * V3 — Vertical Bar with Milestone Labels
 * A tall filled bar with 25/50/75/100% tick marks and labels on the right.
 * Clean, dashboard-widget style.
 */
function DailyGoalV3VerticalBar() {
  const [goal, setGoal] = useState(8)
  const goalMs = goal * 3600000
  const pct    = Math.min(100, (TODAY_MS / goalMs) * 100)
  const milestones = [100, 75, 50, 25]

  return (
    <div className="max-w-xs mx-auto space-y-4">
      <div className="flex gap-5 items-stretch">
        {/* Bar */}
        <div className="relative w-10 rounded-2xl bg-stone-100 dark:bg-stone-800 overflow-hidden shrink-0" style={{ height: 260 }}>
          <div
            className="absolute bottom-0 left-0 right-0 rounded-2xl transition-all duration-700"
            style={{ height: `${pct}%`, background: pct >= 100 ? '#10b981' : 'linear-gradient(to top, #4f46e5, #818cf8)' }}
          />
          {milestones.map(m => (
            <div key={m} className="absolute left-0 right-0 h-px bg-white/30 dark:bg-white/10" style={{ bottom: `${m}%` }} />
          ))}
          {/* Current position dot */}
          <div className="absolute left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md border-2 border-indigo-500 transition-all duration-700"
            style={{ bottom: `calc(${pct}% - 7px)` }} />
        </div>

        {/* Milestone labels */}
        <div className="relative flex-1" style={{ height: 260 }}>
          {milestones.map(m => (
            <div key={m} className="absolute right-0 flex items-center gap-2 -translate-y-1/2" style={{ bottom: `${m}%` }}>
              <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', pct >= m ? 'bg-indigo-500' : 'bg-stone-300 dark:bg-stone-600')} />
              <span className={cn('text-xs font-medium whitespace-nowrap', pct >= m ? 'text-indigo-600 dark:text-indigo-400' : 'text-stone-400 dark:text-stone-600')}>
                {m}% · {formatDuration(goalMs * m / 100)}
              </span>
            </div>
          ))}
          <div className="absolute bottom-0 right-0 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-stone-200 dark:bg-stone-700 shrink-0" />
            <span className="text-xs text-stone-400 dark:text-stone-600">0h</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] rounded-xl p-3 flex items-center justify-between">
        <div>
          <p className="text-xl font-bold tabular-nums text-stone-800 dark:text-stone-100">{Math.round(pct)}%</p>
          <p className="text-xs text-stone-400">{formatDuration(TODAY_MS)} of {goal}h</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">{formatDuration(goalRemaining(TODAY_MS, goalMs))}</p>
          <p className="text-xs text-stone-400">remaining</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <span className="text-xs text-stone-400">Goal</span>
        <input type="number" min={1} max={16} value={goal} onChange={e => setGoal(parseInt(e.target.value) || 8)}
          className="w-12 h-7 text-center text-xs font-bold border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-[var(--dark-elevated)] text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
        <span className="text-xs text-stone-400">h/day</span>
      </div>
    </div>
  )
}

/**
 * V4 — Scorecard with Grade + Streak
 * Letter grade ring (A–F), current hours, streak days, and a mini week bar.
 * At-a-glance performance view.
 */
function DailyGoalV4Scorecard() {
  const pct = goalPct(TODAY_MS, GOAL_MS)
  const grade = pct >= 100 ? 'A' : pct >= 80 ? 'B' : pct >= 60 ? 'C' : pct >= 40 ? 'D' : 'F'
  const gradeColor = grade === 'A' || grade === 'B' ? '#6366f1' : grade === 'C' ? '#f59e0b' : '#ef4444'
  const r = 32; const circ = 2 * Math.PI * r

  return (
    <div className="max-w-sm mx-auto">
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-5">
          {/* Grade ring */}
          <div className="relative shrink-0" style={{ width: 80, height: 80 }}>
            <svg width={80} height={80} viewBox="0 0 80 80">
              <circle cx={40} cy={40} r={r} fill="none" strokeWidth={8}
                stroke="currentColor" className="text-stone-100 dark:text-stone-800" />
              <circle cx={40} cy={40} r={r} fill="none" strokeWidth={8} strokeLinecap="round"
                stroke={gradeColor}
                strokeDasharray={`${circ * pct / 100} ${circ * (1 - pct / 100)}`}
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-black" style={{ color: gradeColor }}>{grade}</span>
            </div>
          </div>

          {/* Numbers */}
          <div className="flex-1 space-y-2">
            <div>
              <p className="text-2xl font-bold tabular-nums text-stone-800 dark:text-stone-100">{formatDuration(TODAY_MS)}</p>
              <p className="text-xs text-stone-400 dark:text-stone-500">of 8h · {pct}% done</p>
            </div>
            <div className="flex gap-4">
              <div>
                <p className="text-sm font-bold text-stone-800 dark:text-stone-100">🔥 5</p>
                <p className="text-[10px] text-stone-400">day streak</p>
              </div>
              <div>
                <p className="text-sm font-bold text-stone-800 dark:text-stone-100">{formatDuration(goalRemaining(TODAY_MS, GOAL_MS))}</p>
                <p className="text-[10px] text-stone-400">remaining</p>
              </div>
            </div>
          </div>
        </div>

        {/* This week mini chart */}
        <div className="border-t border-stone-100 dark:border-[var(--dark-border)] pt-3">
          <p className="text-[10px] text-stone-400 dark:text-stone-500 mb-2">This week</p>
          <div className="flex gap-1 items-end h-10">
            {MOCK_WEEK_DAYS.map((d, i) => {
              const dayPct = d.targetMs > 0 ? Math.min(1, d.totalMs / d.targetMs) : 0
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-sm overflow-hidden" style={{ height: 28 }}>
                    <div className="bg-indigo-400 dark:bg-indigo-600 w-full transition-all duration-300 rounded-sm"
                      style={{ height: `${dayPct * 100}%` }} />
                  </div>
                  <span className="text-[8px] text-stone-400">{d.label[0]}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * V5 — Motivational Focus Card
 * Minimal typographic design. Big "time left" number up front, thin
 * progress bar, a motivational status line, and a small weekly streak row.
 * Calm and distraction-free.
 */
function DailyGoalV5FocusCard() {
  const [goal, setGoal] = useState(8)
  const goalMs = goal * 3600000
  const pct    = Math.min(100, (TODAY_MS / goalMs) * 100)
  const remaining = goalRemaining(TODAY_MS, goalMs)
  const color  = pct >= 100 ? 'text-emerald-600 dark:text-emerald-400' : pct >= 75 ? 'text-indigo-600 dark:text-indigo-400' : 'text-stone-800 dark:text-stone-100'
  const status = pct >= 100 ? '🎉 You hit your goal!' : pct >= 75 ? '💪 Almost there!' : pct >= 50 ? '⚡ Halfway done, keep going' : pct >= 25 ? '🌱 Good start, stay focused' : '🚀 Let\'s get started'

  return (
    <div className="max-w-xs mx-auto space-y-5">
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] rounded-2xl p-6 space-y-4 shadow-sm text-center">
        <div>
          <p className="text-xs text-stone-400 dark:text-stone-500 uppercase tracking-widest font-medium mb-2">Today's Progress</p>
          <p className={cn('text-5xl font-black tabular-nums leading-none', color)}>{formatDuration(TODAY_MS)}</p>
          <p className="text-sm text-stone-400 dark:text-stone-500 mt-2">of {goal}h goal</p>
        </div>

        {/* Bar */}
        <div className="h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: pct >= 100 ? '#10b981' : 'linear-gradient(to right, #6366f1, #818cf8)' }} />
        </div>

        <p className="text-sm text-stone-600 dark:text-stone-300 font-medium">{status}</p>

        {remaining > 0 && (
          <div className="bg-stone-50 dark:bg-[var(--dark-elevated)] rounded-xl p-3">
            <p className="text-2xl font-bold tabular-nums text-stone-700 dark:text-stone-200">{formatDuration(remaining)}</p>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">left to reach your goal</p>
          </div>
        )}
      </div>

      {/* Streak dots */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-xs text-stone-400 dark:text-stone-500">🔥 5 day streak</span>
        <div className="flex gap-1">
          {[1,2,3,4,5,6,7].map(d => (
            <div key={d} className={cn('w-2.5 h-2.5 rounded-full', d <= 5 ? 'bg-indigo-400' : 'bg-stone-200 dark:bg-stone-700')} />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <span className="text-xs text-stone-400">Goal</span>
        <input type="number" min={1} max={16} value={goal} onChange={e => setGoal(parseInt(e.target.value) || 8)}
          className="w-12 h-7 text-center text-xs font-bold border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-[var(--dark-elevated)] text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
        <span className="text-xs text-stone-400">h/day</span>
      </div>
    </div>
  )
}

// ── Horizontal designs ───────────────────────────────────────────────────────

/**
 * H1 — Wide Progress Bar Card
 * Full-width horizontal bar with gradient fill, percentage centred inside,
 * time-worked left and goal right. Colour shifts as progress increases.
 */
function DailyGoalH1WideBar() {
  const [goal, setGoal] = useState(8)
  const goalMs = goal * 3600000
  const pct    = Math.min(100, (TODAY_MS / goalMs) * 100)
  const color  = pct >= 100 ? ['#059669','#10b981'] : pct >= 75 ? ['#4f46e5','#6366f1'] : pct >= 50 ? ['#d97706','#f59e0b'] : ['#94a3b8','#cbd5e1']

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-stone-700 dark:text-stone-200">Today's Progress</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400">Goal:</span>
            <input type="number" min={1} max={16} value={goal} onChange={e => setGoal(parseInt(e.target.value) || 8)}
              className="w-12 h-7 text-center text-xs font-bold border border-stone-200 dark:border-stone-700 rounded-lg bg-transparent text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
            <span className="text-xs text-stone-400">h</span>
          </div>
        </div>

        {/* Bar */}
        <div className="relative h-10 bg-stone-100 dark:bg-stone-800 rounded-xl overflow-hidden">
          <div className="absolute inset-y-0 left-0 rounded-xl transition-all duration-700"
            style={{ width: `${pct}%`, background: `linear-gradient(to right, ${color[0]}, ${color[1]})` }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-white drop-shadow-sm tabular-nums">{Math.round(pct)}%</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="font-bold tabular-nums text-stone-800 dark:text-stone-100">{formatDuration(TODAY_MS)}</span>
            <span className="text-stone-400 dark:text-stone-500"> worked</span>
          </div>
          {pct < 100
            ? <span className="text-stone-500 dark:text-stone-400">{formatDuration(goalRemaining(TODAY_MS, goalMs))} remaining</span>
            : <span className="text-emerald-600 dark:text-emerald-400 font-semibold">🎉 Goal achieved!</span>}
        </div>
      </div>

      {/* Weekly context row */}
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] rounded-2xl p-4 shadow-sm">
        <p className="text-xs text-stone-400 dark:text-stone-500 mb-3">This week</p>
        <div className="flex gap-2">
          {MOCK_WEEK_DAYS.map((d, i) => {
            const dp = d.targetMs > 0 ? Math.min(100, Math.round(d.totalMs / d.targetMs * 100)) : 0
            const isToday = i === 4
            return (
              <div key={i} className="flex-1 space-y-1.5">
                <div className={cn('h-2 rounded-full overflow-hidden', isToday ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-stone-100 dark:bg-stone-800')}>
                  <div className={cn('h-full rounded-full transition-all', isToday ? 'bg-indigo-500' : 'bg-stone-400 dark:bg-stone-600')}
                    style={{ width: `${dp}%` }} />
                </div>
                <div className="text-center">
                  <p className={cn('text-[9px] font-medium', isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-stone-400 dark:text-stone-600')}>{d.label}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/**
 * H2 — Milestone Journey
 * Horizontal track with stops at 0 / 25 / 50 / 75 / 100%.
 * A dot travels along it showing current position. Completed stops glow.
 */
function DailyGoalH2MilestoneJourney() {
  const [goal, setGoal] = useState(8)
  const goalMs = goal * 3600000
  const pct    = Math.min(100, (TODAY_MS / goalMs) * 100)

  const stops = [
    { pct: 0,   label: '0h',   icon: '🚀' },
    { pct: 25,  label: `${goal * 0.25}h`, icon: '⚡' },
    { pct: 50,  label: `${goal * 0.5}h`,  icon: '💪' },
    { pct: 75,  label: `${goal * 0.75}h`, icon: '🔥' },
    { pct: 100, label: `${goal}h`,         icon: '🏆' },
  ]

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-stone-400 dark:text-stone-500">Today</p>
            <p className="text-2xl font-bold tabular-nums text-stone-800 dark:text-stone-100">{formatDuration(TODAY_MS)}<span className="text-sm font-normal text-stone-400 ml-1">/ {goal}h</span></p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400">Goal</span>
            <input type="number" min={1} max={16} value={goal} onChange={e => setGoal(parseInt(e.target.value) || 8)}
              className="w-12 h-8 text-center text-sm font-bold border border-stone-200 dark:border-stone-700 rounded-lg bg-transparent text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
            <span className="text-xs text-stone-400">h</span>
          </div>
        </div>

        {/* Track */}
        <div className="relative">
          {/* Icons above */}
          <div className="flex justify-between mb-2">
            {stops.map(s => (
              <div key={s.pct} className="flex flex-col items-center gap-0.5" style={{ width: 40 }}>
                <span className={cn('text-lg transition-all', pct >= s.pct ? 'opacity-100' : 'opacity-25')}>{s.icon}</span>
              </div>
            ))}
          </div>

          {/* Bar */}
          <div className="relative h-4 bg-stone-100 dark:bg-stone-800 rounded-full mx-5">
            <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: 'linear-gradient(to right, #6366f1, #818cf8)' }} />
            {/* Current position dot */}
            <div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white dark:bg-stone-900 border-2 border-indigo-500 shadow transition-all duration-700"
              style={{ left: `calc(${pct}% - 10px)` }} />
          </div>

          {/* Labels below */}
          <div className="flex justify-between mt-2">
            {stops.map(s => (
              <div key={s.pct} className="flex flex-col items-center" style={{ width: 40 }}>
                <span className={cn('text-[10px] font-medium', pct >= s.pct ? 'text-indigo-600 dark:text-indigo-400' : 'text-stone-400 dark:text-stone-600')}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * H3 — Compact Header Band
 * Ultra-thin single row — time worked · progress bar · goal.
 * Designed to sit at the top of a page like a loading indicator.
 * Expandable on click for full detail.
 */
function DailyGoalH3HeaderBand() {
  const [expanded, setExpanded] = useState(false)
  const [goal, setGoal]         = useState(8)
  const goalMs = goal * 3600000
  const pct    = Math.min(100, (TODAY_MS / goalMs) * 100)

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      <p className="text-xs text-stone-400 dark:text-stone-500 text-center">Compact band — click to expand</p>

      {/* Band */}
      <div
        onClick={() => setExpanded(e => !e)}
        className="bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] rounded-2xl px-5 py-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold tabular-nums text-indigo-600 dark:text-indigo-400 shrink-0">{formatDuration(TODAY_MS)}</span>
          <div className="flex-1 h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: pct >= 100 ? '#10b981' : 'linear-gradient(to right, #6366f1, #818cf8)' }} />
          </div>
          <span className="text-xs text-stone-400 dark:text-stone-500 shrink-0 tabular-nums">{goal}h goal</span>
          <span className="text-xs font-semibold shrink-0 tabular-nums"
            style={{ color: pct >= 100 ? '#10b981' : '#6366f1' }}>{Math.round(pct)}%</span>
          <ChevronDown className={cn('h-4 w-4 text-stone-400 shrink-0 transition-transform', expanded ? 'rotate-180' : '')} />
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-stone-100 dark:border-[var(--dark-border)] grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold tabular-nums text-stone-800 dark:text-stone-100">{formatDuration(TODAY_MS)}</p>
              <p className="text-xs text-stone-400">worked today</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums text-stone-800 dark:text-stone-100">{formatDuration(goalRemaining(TODAY_MS, goalMs))}</p>
              <p className="text-xs text-stone-400">remaining</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1">
                <input type="number" min={1} max={16} value={goal} onClick={e => e.stopPropagation()} onChange={e => setGoal(parseInt(e.target.value) || 8)}
                  className="w-12 h-7 text-center text-sm font-bold border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-[var(--dark-elevated)] text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                <span className="text-xs text-stone-400">h</span>
              </div>
              <p className="text-xs text-stone-400">daily goal</p>
            </div>
          </div>
        )}
      </div>

      {/* Simulated page content below */}
      <div className="bg-stone-50 dark:bg-[var(--dark-elevated)] rounded-2xl p-6 border border-stone-100 dark:border-[var(--dark-border)]">
        <p className="text-xs text-stone-400 dark:text-stone-500 text-center">↑ The band lives here at the top of the page</p>
      </div>
    </div>
  )
}

/**
 * H4 — Pill Track with Hour Markers
 * A wide stadium-shaped track. Markers at each hour. Fill advances left-to-right.
 * Large and touch-friendly.
 */
function DailyGoalH4PillTrack() {
  const [goal, setGoal] = useState(8)
  const workedH = TODAY_MS / 3600000
  const pct     = Math.min(100, (workedH / goal) * 100)

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">Daily goal tracker</p>
          <div className="flex items-center gap-1.5">
            <input type="number" min={1} max={16} value={goal} onChange={e => setGoal(parseInt(e.target.value) || 8)}
              className="w-12 h-7 text-center text-xs font-bold border border-stone-200 dark:border-stone-700 rounded-lg bg-transparent text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
            <span className="text-xs text-stone-400">h goal</span>
          </div>
        </div>

        {/* Pill track */}
        <div className="relative h-14 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
          {/* Fill */}
          <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: 'linear-gradient(to right, #6366f1, #818cf8)' }} />

          {/* Hour marker lines */}
          {Array.from({ length: goal - 1 }, (_, i) => (
            <div key={i} className="absolute top-2 bottom-2 w-px bg-white/30 dark:bg-white/15"
              style={{ left: `${((i + 1) / goal) * 100}%` }} />
          ))}

          {/* Text overlay */}
          <div className="absolute inset-0 flex items-center justify-between px-5">
            <span className="text-sm font-bold text-white drop-shadow tabular-nums">{formatDuration(TODAY_MS)}</span>
            <span className="text-sm font-semibold text-white/80 tabular-nums">{Math.round(pct)}%</span>
          </div>
        </div>

        {/* Hour labels */}
        <div className="flex justify-between px-1">
          {Array.from({ length: goal + 1 }, (_, i) => (
            <span key={i} className={cn('text-[10px] font-medium', i <= Math.floor(workedH) ? 'text-indigo-600 dark:text-indigo-400' : 'text-stone-300 dark:text-stone-700')}>
              {i}h
            </span>
          ))}
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-stone-500 dark:text-stone-400">🔥 5-day streak</span>
          <span className="font-medium text-stone-700 dark:text-stone-200">
            {workedH < goal ? `${formatDuration(goalRemaining(TODAY_MS, goal * 3600000))} to go` : '🏆 Done!'}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * H5 — Week Overview Strip
 * 7-day horizontal strip. Each day has a thin bar and hours.
 * Today is highlighted and taller. Weekly summary on the right.
 */
function DailyGoalH5WeekStrip() {
  const weekTotal  = MOCK_WEEK_DAYS.reduce((s, d) => s + d.totalMs, 0)
  const weekTarget = MOCK_WEEK_DAYS.reduce((s, d) => s + d.targetMs, 0)
  const weekPct    = weekTarget > 0 ? Math.min(100, Math.round(weekTotal / weekTarget * 100)) : 0
  const todayIdx   = 4 // Friday in mock data

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] rounded-2xl p-5 shadow-sm">
        <div className="flex gap-4">
          {/* Day columns */}
          <div className="flex-1 flex gap-2 items-end">
            {MOCK_WEEK_DAYS.map((d, i) => {
              const dp = d.targetMs > 0 ? Math.min(1, d.totalMs / d.targetMs) : 0
              const isToday = i === todayIdx
              const barH = isToday ? 88 : 64
              return (
                <div key={i} className={cn('flex-1 flex flex-col items-center gap-1.5', isToday ? 'relative' : '')}>
                  {isToday && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    </div>
                  )}
                  <span className={cn('text-[10px] font-semibold tabular-nums', isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-stone-400 dark:text-stone-600')}>
                    {formatDuration(d.totalMs)}
                  </span>
                  <div className={cn('w-full rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800', isToday ? 'ring-2 ring-indigo-400 ring-offset-1 dark:ring-offset-[var(--dark-card)]' : '')}
                    style={{ height: barH }}>
                    <div className="w-full rounded-xl transition-all duration-500"
                      style={{ height: `${dp * 100}%`, background: isToday ? 'linear-gradient(to top, #4f46e5, #818cf8)' : dp >= 1 ? '#a5b4fc' : '#c7d2fe' }} />
                  </div>
                  <span className={cn('text-[10px] font-medium', isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-stone-400 dark:text-stone-600')}>{d.label}</span>
                </div>
              )
            })}
          </div>

          {/* Summary card */}
          <div className="w-28 bg-stone-50 dark:bg-[var(--dark-elevated)] rounded-xl p-3 flex flex-col justify-between shrink-0">
            <div>
              <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wider font-medium">Week</p>
              <p className="text-xl font-bold tabular-nums text-stone-800 dark:text-stone-100 mt-0.5">{weekPct}%</p>
              <p className="text-[10px] text-stone-500 dark:text-stone-400">{formatDuration(weekTotal)}</p>
              <p className="text-[10px] text-stone-400 dark:text-stone-500">of {formatDuration(weekTarget)}</p>
            </div>
            <div>
              <div className="h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${weekPct}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 3 — QUICK ADD ENTRY
// ════════════════════════════════════════════════════════════════════════════

function QuickAddV1InlineDrawer() {
  const [open, setOpen] = useState(false)
  return (
    <div className="max-w-2xl mx-auto space-y-2">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className={cn(
            'w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all',
            open
              ? 'bg-white dark:bg-[var(--dark-card)] border-indigo-200 dark:border-indigo-900/50'
              : 'bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 hover:bg-white dark:hover:bg-[var(--dark-card)] hover:border-stone-300'
          )}>
            <div className={cn('w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors', open ? 'bg-indigo-500' : 'bg-stone-300 dark:bg-stone-600')}>
              <Plus className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-medium text-stone-500 dark:text-stone-400">{open ? 'New time entry' : 'Add entry…'}</span>
            <ChevronDown className={cn('h-4 w-4 text-stone-400 ml-auto transition-transform duration-200', open && 'rotate-180')} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="bg-white dark:bg-[var(--dark-card)] border border-t-0 border-stone-200 dark:border-[var(--dark-border)] rounded-b-2xl px-4 py-4 space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <Input type="date" defaultValue="2026-02-25" className="h-9 text-sm w-36" />
              <Input type="time" defaultValue="09:00" className="h-9 text-sm w-28" />
              <span className="text-stone-400 text-sm">→</span>
              <Input type="time" defaultValue="11:00" className="h-9 text-sm w-28" />
              <span className="text-xs font-medium text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded-lg">2h 00m</span>
            </div>
            <div className="flex gap-2">
              <select className="w-36 shrink-0 h-9 text-sm px-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200">
                <option value="">No project</option>
                {MOCK_PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <Input placeholder="Description (optional)" className="h-9 text-sm flex-1" />
              <Button className="h-9 bg-indigo-500 hover:bg-indigo-600 text-white shrink-0" onClick={() => setOpen(false)}>Save</Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {MOCK_ENTRIES.slice(0, 3).map(entry => {
        const proj = getProject(entry.projectId)
        return (
          <div key={entry.id} className="flex items-center bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-xl px-4 py-3 gap-3">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: proj?.color ?? '#d1d5db' }} />
            <span className="flex-1 text-sm text-stone-700 dark:text-stone-200 truncate">{entry.description}</span>
            <span className="text-xs text-stone-400 dark:text-stone-500">{formatHour(entry.startHour)}</span>
            <span className="text-sm font-bold text-stone-600 dark:text-stone-300 tabular-nums">{formatDuration(entry.durationMs)}</span>
          </div>
        )
      })}
    </div>
  )
}

function QuickAddV2FloatingSheet() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="relative min-h-[380px] bg-stone-50 dark:bg-stone-900/30 rounded-2xl border border-dashed border-stone-200 dark:border-stone-700 overflow-hidden">
        <div className="p-6 space-y-3 opacity-40 pointer-events-none select-none">
          {MOCK_ENTRIES.slice(0, 4).map(entry => {
            const proj = getProject(entry.projectId)
            return (
              <div key={entry.id} className="flex items-center bg-white dark:bg-[var(--dark-card)] rounded-xl px-4 py-3 gap-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: proj?.color ?? '#ccc' }} />
                <span className="flex-1 text-sm text-stone-600 dark:text-stone-400 truncate">{entry.description}</span>
                <span className="text-sm font-bold text-stone-500">{formatDuration(entry.durationMs)}</span>
              </div>
            )
          })}
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <button className="absolute bottom-5 right-5 w-14 h-14 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-500/40 flex items-center justify-center transition-all hover:scale-105 active:scale-95">
              <Plus className="h-6 w-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl max-w-2xl mx-auto">
            <SheetHeader>
              <SheetTitle className="text-base">Add Time Entry</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 pt-4 pb-8">
              <Input placeholder="What did you work on?" className="h-10" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-stone-500 mb-1.5 block">Project</label>
                  <select className="w-full h-9 text-sm px-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200">
                    <option value="">No project</option>
                    {MOCK_PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-500 mb-1.5 block">Duration</label>
                  <Input type="time" defaultValue="01:00" className="h-9 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-stone-500 mb-1.5 block">Start</label>
                  <Input type="time" defaultValue="09:00" className="h-9 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-500 mb-1.5 block">End</label>
                  <Input type="time" defaultValue="10:00" className="h-9 text-sm" />
                </div>
              </div>
              <Button className="w-full bg-indigo-500 hover:bg-indigo-600 text-white">Save Entry</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <p className="text-xs text-stone-400 dark:text-stone-500 text-center mt-3">Click the ⊕ button to add an entry</p>
    </div>
  )
}

function QuickAddV3NaturalLanguage() {
  const [input, setInput] = useState('')

  const durHMatch  = input.match(/(\d+(?:\.\d+)?)\s*(?:h|hour|hours)\b/i)
  const durMMatch  = input.match(/(\d+)\s*(?:m|min|minute|minutes)\b/i)
  const projMatch  = MOCK_PROJECTS.find(p => input.toLowerCase().includes(p.name.toLowerCase()))
  const durMs      = durHMatch ? parseFloat(durHMatch[1]) * 3600000 : durMMatch ? parseInt(durMMatch[1]) * 60000 : 0
  const cleanDesc  = input
    .replace(/(\d+(?:\.\d+)?)\s*(?:h|hour|hours|m|min|minute|minutes)\b/gi, '')
    .replace(projMatch ? new RegExp(projMatch.name, 'i') : /(?!x)x/, '')
    .replace(/[–—\-]\s*/g, '')
    .trim()
  const hasParsed  = durMs > 0 || !!projMatch || cleanDesc.length > 3

  const examples = ['"2h Frontend – fix auth bug"', '"30m Meetings"', '"1.5h Design review"']

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">Type naturally</p>
        <p className="text-xs text-stone-400 dark:text-stone-500">We parse duration, project, and description automatically</p>
      </div>

      <div className="relative">
        <Input
          className="h-12 text-sm pr-12 rounded-2xl"
          placeholder='e.g. 2h Frontend – fix auth bug'
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        {input && (
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-400" onClick={() => setInput('')}>
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {hasParsed && (
        <div className="bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-100 dark:border-stone-800 p-4 space-y-3">
          <p className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Parsed as</p>
          <div className="flex flex-wrap gap-2">
            {durMs > 0 && (
              <Badge className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-0 gap-1.5">
                <Clock className="h-3 w-3" /> {formatDuration(durMs)}
              </Badge>
            )}
            {projMatch && (
              <Badge className="border-0 text-white gap-1.5" style={{ backgroundColor: projMatch.color }}>
                {projMatch.name}
              </Badge>
            )}
            {cleanDesc.length > 3 && (
              <Badge variant="secondary" className="max-w-[220px] truncate">
                &ldquo;{cleanDesc}&rdquo;
              </Badge>
            )}
          </div>
          {durMs === 0 && (
            <p className="text-xs text-amber-500 dark:text-amber-400">⚠ No duration found — try &ldquo;2h&rdquo; or &ldquo;30m&rdquo;</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {examples.map(ex => (
          <button
            key={ex}
            className="text-xs px-2.5 py-1 bg-stone-100 dark:bg-stone-800 rounded-lg text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
            onClick={() => setInput(ex.slice(1, -1))}
          >
            {ex}
          </button>
        ))}
      </div>

      <Button className="w-full bg-indigo-500 hover:bg-indigo-600 text-white" disabled={!hasParsed}>
        Add Entry
      </Button>
    </div>
  )
}

function QuickAddV4DurationFirst() {
  const [durMs,   setDurMs]   = useState<number | null>(null)
  const [projId,  setProjId]  = useState<string | null>(null)
  const [desc,    setDesc]    = useState('')

  const step = durMs === null ? 1 : projId === null ? 2 : 3

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-2xl overflow-hidden shadow-sm">
        {/* Progress bar */}
        <div className="h-1 bg-stone-100 dark:bg-stone-800">
          <div className="h-full bg-indigo-500 transition-all duration-300 rounded-r-full" style={{ width: `${(step / 3) * 100}%` }} />
        </div>

        <div className="flex divide-x divide-stone-100 dark:divide-stone-800">
          {/* Section 1 — Duration */}
          <div className={cn('flex-1 p-5 transition-colors', step === 1 ? '' : 'bg-stone-50/60 dark:bg-stone-800/20')}>
            <div className="flex items-center gap-2 mb-3">
              <div className={cn('w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0', durMs !== null ? 'bg-emerald-500 text-white' : 'bg-indigo-500 text-white')}>
                {durMs !== null ? <Check className="h-3 w-3" /> : '1'}
              </div>
              <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">Duration</span>
            </div>
            {durMs !== null ? (
              <div className="flex items-center gap-2">
                <Badge className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-0">{formatDuration(durMs)}</Badge>
                <button className="text-xs text-stone-400 hover:text-indigo-500" onClick={() => { setDurMs(null); setProjId(null); setDesc('') }}>Change</button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {DURATION_PRESETS.map(d => (
                  <button
                    key={d.label}
                    onClick={() => setDurMs(d.ms)}
                    className="px-3 py-1.5 text-xs font-medium bg-stone-100 dark:bg-stone-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-indigo-200 dark:hover:border-indigo-700 transition-all"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Section 2 — Project */}
          <div className={cn('flex-1 p-5 transition-all', step < 2 ? 'opacity-40 pointer-events-none' : step === 2 ? '' : 'bg-stone-50/60 dark:bg-stone-800/20')}>
            <div className="flex items-center gap-2 mb-3">
              <div className={cn('w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0', projId !== null ? 'bg-emerald-500 text-white' : step === 2 ? 'bg-indigo-500 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-500')}>
                {projId !== null ? <Check className="h-3 w-3" /> : '2'}
              </div>
              <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">Project</span>
            </div>
            {projId !== null ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: getProject(projId)?.color }}>
                  {getProject(projId)?.name}
                </span>
                <button className="text-xs text-stone-400 hover:text-indigo-500" onClick={() => { setProjId(null); setDesc('') }}>Change</button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {MOCK_PROJECTS.slice(0, 5).map(p => (
                  <button
                    key={p.id}
                    onClick={() => setProjId(p.id)}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-xl border border-stone-200 dark:border-stone-700 hover:border-stone-300 transition-all text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800"
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Section 3 — Description */}
          <div className={cn('flex-1 p-5 transition-all', step < 3 ? 'opacity-40 pointer-events-none' : '')}>
            <div className="flex items-center gap-2 mb-3">
              <div className={cn('w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0', step === 3 ? 'bg-indigo-500 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-500')}>3</div>
              <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">Details</span>
            </div>
            <div className="space-y-2">
              <Input placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} className="h-8 text-sm" />
              <Button className="w-full h-8 text-sm bg-indigo-500 hover:bg-indigo-600 text-white" disabled={step < 3}>
                Save Entry
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 4 — DASHBOARD
// ════════════════════════════════════════════════════════════════════════════

function DashboardV1TodayFocus() {
  const todayMs  = 11700000
  const targetMs = 28800000
  const pct      = todayMs / targetMs
  const r        = 52
  const circ     = 2 * Math.PI * r

  const todayEntries = MOCK_ENTRIES.filter(e => e.date === '2026-02-25')
  const byProject    = MOCK_PROJECTS.map(p => ({ ...p, ms: todayEntries.filter(e => e.projectId === p.id).reduce((s, e) => s + e.durationMs, 0) })).filter(p => p.ms > 0)

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Arc gauge */}
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-2xl p-6 flex flex-col items-center">
        <div className="relative">
          <svg width="128" height="128" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={64} cy={64} r={r} fill="none" strokeWidth="10" stroke="#f1f0ef" />
            <circle cx={64} cy={64} r={r} fill="none" strokeWidth="10" strokeLinecap="round" stroke="#6366f1" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums text-stone-800 dark:text-stone-100">{formatDuration(todayMs)}</span>
            <span className="text-[10px] text-stone-400 dark:text-stone-500">of {formatDuration(targetMs)}</span>
          </div>
        </div>

        <div className="flex gap-8 mt-5">
          {[
            { label: 'This week', value: '17h 30m' },
            { label: 'Streak',    value: '3 days'  },
            { label: 'Entries',   value: '10'      },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-base font-bold text-stone-700 dark:text-stone-200">{s.value}</div>
              <div className="text-[10px] text-stone-400 dark:text-stone-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Project breakdown bar */}
      {byProject.length > 0 && (
        <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-2xl p-4">
          <p className="text-xs font-medium text-stone-400 dark:text-stone-500 mb-3">Today by project</p>
          <TooltipProvider>
            <div className="h-4 flex rounded-full overflow-hidden gap-0.5">
              {byProject.map(p => (
                <Tooltip key={p.id}>
                  <TooltipTrigger asChild>
                    <div className="h-full" style={{ width: `${(p.ms / todayMs) * 100}%`, backgroundColor: p.color }} />
                  </TooltipTrigger>
                  <TooltipContent>{p.name} — {formatDuration(p.ms)}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
          <div className="flex flex-wrap gap-3 mt-3">
            {byProject.map(p => (
              <div key={p.id} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-xs text-stone-500 dark:text-stone-400">{p.name}</span>
                <span className="text-xs font-medium text-stone-600 dark:text-stone-300">{formatDuration(p.ms)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DashboardV2WeekGrid() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Week of Feb 20</h3>
          <Badge variant="secondary">17h 30m total</Badge>
        </div>
        <div className="flex gap-2">
          {MOCK_WEEK_DAYS.map((day, i) => {
            const pct      = day.targetMs > 0 ? Math.min(day.totalMs / day.targetMs, 1) : 0
            const isToday  = i === 1
            const isWork   = day.targetMs > 0
            return (
              <div key={day.label} className={cn('flex-1 flex flex-col items-center gap-2', !isWork && 'opacity-40')}>
                <span className={cn('text-[10px] font-semibold uppercase tracking-wider', isToday ? 'text-indigo-500' : 'text-stone-400 dark:text-stone-500')}>{day.label}</span>
                <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-xl overflow-hidden relative" style={{ height: 120 }}>
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-xl transition-all duration-500"
                    style={{ height: `${pct * 100}%`, backgroundColor: isToday ? '#6366f1' : '#a5b4c8' }}
                  />
                </div>
                <span className={cn('text-xs font-medium tabular-nums', isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-stone-500 dark:text-stone-400')}>
                  {day.totalMs > 0 ? formatDuration(day.totalMs) : '—'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function DashboardV3ProjectLeaderboard() {
  const projectStats = MOCK_PROJECTS.map(p => ({
    ...p,
    weekMs: MOCK_ENTRIES.filter(e => e.projectId === p.id).reduce((s, e) => s + e.durationMs, 0),
  })).filter(p => p.weekMs > 0).sort((a, b) => b.weekMs - a.weekMs)
  const totalMs = projectStats.reduce((s, p) => s + p.weekMs, 0)

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-400 dark:text-stone-500">This week</p>
            <p className="text-2xl font-bold text-stone-800 dark:text-stone-100">{formatDuration(totalMs)}</p>
          </div>
          <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-0">↑ 12% vs last week</Badge>
        </div>
      </div>

      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-2xl p-5 space-y-4">
        <p className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">By project</p>
        {projectStats.map((p, i) => {
          const pct = (p.weekMs / totalMs) * 100
          return (
            <div key={p.id} className="flex items-center gap-3">
              <span className="text-xs font-bold text-stone-300 dark:text-stone-600 w-4 text-center tabular-nums">{i + 1}</span>
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-stone-700 dark:text-stone-200">{p.name}</span>
                  <span className="text-sm font-bold text-stone-700 dark:text-stone-200 tabular-nums">{formatDuration(p.weekMs)}</span>
                </div>
                <div className="h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: p.color }} />
                </div>
              </div>
              <span className="text-xs text-stone-400 w-8 text-right tabular-nums">{Math.round(pct)}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DashboardV4Heatmap() {
  const levelClasses = [
    'bg-stone-100 dark:bg-stone-800',
    'bg-indigo-100 dark:bg-indigo-900/50',
    'bg-indigo-300 dark:bg-indigo-700/60',
    'bg-indigo-500',
    'bg-indigo-700',
  ]
  const levelLabels = ['No activity', 'Light', 'Moderate', 'Productive', 'Very productive']

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">Activity — last 12 weeks</p>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-stone-400">Less</span>
            {levelClasses.map((c, i) => <div key={i} className={cn('w-3 h-3 rounded-sm', c)} />)}
            <span className="text-[10px] text-stone-400">More</span>
          </div>
        </div>
        <TooltipProvider>
          <div className="grid gap-1" style={{ gridTemplateRows: 'repeat(7, 1fr)', gridAutoFlow: 'column' }}>
            {HEATMAP_DATA.map((d, i) => (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <div className={cn('w-4 h-4 rounded-sm cursor-default transition-all hover:ring-2 hover:ring-indigo-400 hover:ring-offset-1', levelClasses[d.level])} />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[10px]">{levelLabels[d.level]} · Day {d.i + 1}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </div>

      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-2xl p-5">
        <p className="text-sm font-semibold text-stone-700 dark:text-stone-200 mb-3">This week</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Tracked', value: '17h 30m', color: 'text-indigo-600 dark:text-indigo-400'  },
            { label: 'Streak',  value: '3 days',  color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Entries', value: '10',      color: 'text-stone-700 dark:text-stone-200'    },
          ].map(s => (
            <div key={s.label}>
              <div className={cn('text-xl font-bold', s.color)}>{s.value}</div>
              <div className="text-xs text-stone-400 dark:text-stone-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Dashboard extra variants ─────────────────────────────────────────────────

// Mock data used by several new variants
const TREND_14D = [3.5, 5.0, 4.2, 8.0, 7.5, 0, 0, 6.0, 4.75, 3.25, 0, 0, 0, 0]
const TREND_LABELS = ['Mo','Tu','We','Th','Fr','Sa','Su','Mo','Tu','We','Th','Fr','Sa','Su']

const FEB_LEVELS: (0|1|2|3|4)[] = [
  0,0,0,0,0,0, 0,1,2,3,4,2, 1,0,3,4,3,2, 1,0,0,4,3,3, 2,0,0,0,
]

const EARNINGS_PROJECTS = [
  { ...MOCK_PROJECTS[0], rate: 150, weekMs: 16200000  },
  { ...MOCK_PROJECTS[1], rate: 120, weekMs: 14400000  },
  { ...MOCK_PROJECTS[2], rate: 100, weekMs:  6300000  },
  { ...MOCK_PROJECTS[5], rate:  90, weekMs:  3600000  },
]

// V5 — Vertical Daily Timeline
function DashboardV5DailyTimeline() {
  const todayEntries = MOCK_ENTRIES.filter(e => e.date === '2026-02-25')
  const START_H = 8, END_H = 20
  const SLOT_H  = 52 // px per hour

  return (
    <div className="max-w-sm mx-auto">
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Today — Feb 25</h3>
          <Badge variant="secondary">{formatDuration(todayEntries.reduce((s,e)=>s+e.durationMs,0))}</Badge>
        </div>

        <div className="flex gap-3">
          {/* Hour labels */}
          <div className="flex flex-col shrink-0" style={{ gap: 0 }}>
            {Array.from({ length: END_H - START_H + 1 }, (_, i) => {
              const h = START_H + i
              return (
                <div key={h} className="text-[10px] text-stone-400 dark:text-stone-500 text-right pr-1 leading-none" style={{ height: SLOT_H }}>
                  {h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h-12}pm`}
                </div>
              )
            })}
          </div>

          {/* Timeline column */}
          <div className="flex-1 relative border-l border-stone-100 dark:border-stone-800" style={{ height: (END_H - START_H) * SLOT_H }}>
            {/* Hour lines */}
            {Array.from({ length: END_H - START_H }, (_, i) => (
              <div key={i} className="absolute left-0 right-0 border-t border-dashed border-stone-100 dark:border-stone-800" style={{ top: (i + 1) * SLOT_H }} />
            ))}

            {/* Entries */}
            {todayEntries.map(entry => {
              const proj  = getProject(entry.projectId)
              const top   = Math.max(0, (entry.startHour - START_H) * SLOT_H)
              const height= Math.max(20, (entry.endHour - entry.startHour) * SLOT_H - 4)
              return (
                <TooltipProvider key={entry.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="absolute left-2 right-0 rounded-lg px-2 py-1 cursor-pointer overflow-hidden"
                        style={{ top, height, backgroundColor: proj?.color ?? '#d1d5db', opacity: 0.92 }}
                      >
                        <p className="text-[11px] font-semibold text-white truncate leading-tight">{entry.description}</p>
                        <p className="text-[10px] text-white/70">{formatDuration(entry.durationMs)}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {entry.description} · {formatHour(entry.startHour)}–{formatHour(entry.endHour)}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// V6 — Productivity Scorecard
function DashboardV6Scorecard() {
  const score  = 78
  const grade  = score >= 90 ? 'A' : score >= 80 ? 'B+' : score >= 70 ? 'B' : 'C+'
  const r      = 54
  const circ   = 2 * Math.PI * r
  const kpis   = [
    { label: 'Hours today',  value: '3h 15m', max: '8h',   pct: 0.41, ok: false },
    { label: 'Entries',      value: '2',      max: '5 goal',pct: 0.4,  ok: false },
    { label: 'Streak',       value: '3 days', max: '',      pct: 1,    ok: true  },
  ]

  return (
    <div className="max-w-sm mx-auto space-y-4">
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-2xl p-6 flex flex-col items-center gap-4">
        <div className="relative">
          <svg width="136" height="136" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={68} cy={68} r={r} fill="none" strokeWidth="12" stroke="#f1f0ef" className="dark:stroke-stone-800" />
            <circle cx={68} cy={68} r={r} fill="none" strokeWidth="12" strokeLinecap="round"
              stroke={score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'}
              strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-black text-stone-800 dark:text-stone-100">{grade}</span>
            <span className="text-xs text-stone-400 dark:text-stone-500">{score}/100</span>
          </div>
        </div>

        <div className="w-full space-y-3">
          {kpis.map(k => (
            <div key={k.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-stone-500 dark:text-stone-400">{k.label}</span>
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-200">{k.value} {k.max && <span className="font-normal text-stone-400">/ {k.max}</span>}</span>
              </div>
              <div className="h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${k.pct * 100}%`, backgroundColor: k.ok ? '#10b981' : '#6366f1' }} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-stone-400 dark:text-stone-500">vs yesterday:</span>
          <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-0 text-[10px]">↑ 18%</Badge>
        </div>
      </div>
    </div>
  )
}

// V7 — Streak & Habits
function DashboardV7StreakHabits() {
  const streak    = 3
  const bestStreak= 12
  const last7     = [true, true, true, false, false, true, true]
  const dayLabels = ['M','T','W','T','F','S','S']
  const todayGoal = { done: 11700000, target: 28800000 }

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Streak hero */}
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-2xl p-6 text-center">
        <div className="text-5xl mb-2">🔥</div>
        <div className="text-5xl font-black text-stone-800 dark:text-stone-100 tabular-nums">{streak}</div>
        <div className="text-sm text-stone-400 dark:text-stone-500 mt-1">day streak</div>
        <div className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">Best: {bestStreak} days</div>

        {/* Last 7 days */}
        <div className="flex justify-center gap-2 mt-5">
          {last7.map((worked, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs', worked ? 'bg-indigo-500 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-300 dark:text-stone-600')}>
                {worked ? '✓' : '·'}
              </div>
              <span className="text-[10px] text-stone-400 dark:text-stone-500">{dayLabels[i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Today's goal */}
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-2xl p-4 flex items-center gap-4">
        <div className="relative shrink-0">
          <svg width="56" height="56" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={28} cy={28} r={22} fill="none" strokeWidth="5" stroke="#f1f0ef" />
            <circle cx={28} cy={28} r={22} fill="none" strokeWidth="5" strokeLinecap="round" stroke="#6366f1"
              strokeDasharray={2 * Math.PI * 22}
              strokeDashoffset={2 * Math.PI * 22 * (1 - todayGoal.done / todayGoal.target)}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-bold text-stone-700 dark:text-stone-200">41%</span>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">Today&rsquo;s goal</p>
          <p className="text-xs text-stone-400 dark:text-stone-500">{formatDuration(todayGoal.done)} of {formatDuration(todayGoal.target)}</p>
          <p className="text-[10px] text-amber-500 mt-0.5">⚡ 4h 45m to go — keep it up!</p>
        </div>
      </div>
    </div>
  )
}

// V8 — 14-Day Trend Line (SVG)
function DashboardV8TrendLine() {
  const W = 400, H = 140, PAD = { t: 12, r: 12, b: 28, l: 32 }
  const maxH = Math.max(...TREND_14D, 8)
  const pts   = TREND_14D.map((h, i) => ({
    x: PAD.l + (i / (TREND_14D.length - 1)) * (W - PAD.l - PAD.r),
    y: PAD.t + (1 - h / maxH) * (H - PAD.t - PAD.b),
    h,
  }))
  const polyline = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area     = `M${pts[0].x},${H - PAD.b} ` + pts.map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ` L${pts[pts.length-1].x},${H - PAD.b} Z`
  const todayIdx = 9

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Hours — last 14 days</h3>
          <Badge className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-0">avg 4.4h/day</Badge>
        </div>
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
            <defs>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0}    />
              </linearGradient>
            </defs>
            {/* Y grid */}
            {[0, 2, 4, 6, 8].map(h => {
              const y = PAD.t + (1 - h / maxH) * (H - PAD.t - PAD.b)
              return (
                <g key={h}>
                  <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#e7e5e4" strokeWidth={0.5} />
                  <text x={PAD.l - 4} y={y + 3} textAnchor="end" fontSize={8} fill="#a8a29e">{h}h</text>
                </g>
              )
            })}
            {/* Weekend shading */}
            {pts.filter((_, i) => i === 5 || i === 6 || i === 12 || i === 13).map((p, k) => (
              <rect key={k} x={p.x - (W - PAD.l - PAD.r) / (TREND_14D.length - 1) / 2} y={PAD.t} width={(W - PAD.l - PAD.r) / (TREND_14D.length - 1)} height={H - PAD.t - PAD.b} fill="#f5f5f4" fillOpacity={0.7} />
            ))}
            {/* Area fill */}
            <path d={area} fill="url(#lineGrad)" />
            {/* Line */}
            <polyline points={polyline} fill="none" stroke="#6366f1" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {/* Dots */}
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={i === todayIdx ? 5 : 3} fill={i === todayIdx ? '#6366f1' : '#fff'} stroke="#6366f1" strokeWidth={i === todayIdx ? 0 : 2} />
            ))}
            {/* X labels */}
            {pts.map((p, i) => (
              <text key={i} x={p.x} y={H - 4} textAnchor="middle" fontSize={8} fill={i === todayIdx ? '#6366f1' : '#a8a29e'} fontWeight={i === todayIdx ? 700 : 400}>{TREND_LABELS[i]}</text>
            ))}
            {/* Today label */}
            <text x={pts[todayIdx].x} y={pts[todayIdx].y - 9} textAnchor="middle" fontSize={9} fill="#6366f1" fontWeight={700}>Today</text>
          </svg>
        </div>
      </div>
    </div>
  )
}

// V9 — Donut Chart (SVG)
function DashboardV9DonutChart() {
  const stats = MOCK_PROJECTS.map(p => ({
    ...p,
    ms: MOCK_ENTRIES.filter(e => e.projectId === p.id).reduce((s, e) => s + e.durationMs, 0),
  })).filter(p => p.ms > 0)
  const total = stats.reduce((s, p) => s + p.ms, 0)

  const R = 56, cx = 70, cy = 70, gap = 2
  let cumulPct = 0
  const circ = 2 * Math.PI * R
  const arcs = stats.map(p => {
    const pct   = p.ms / total
    const start = cumulPct
    cumulPct   += pct
    return { ...p, pct, start }
  })

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200 mb-4">Project distribution this week</h3>
        <div className="flex items-center gap-6">
          {/* Donut */}
          <div className="shrink-0 relative">
            <svg width={140} height={140}>
              {arcs.map((a, i) => {
                const startAngle = a.start * 2 * Math.PI - Math.PI / 2
                const endAngle   = (a.start + a.pct) * 2 * Math.PI - Math.PI / 2
                const x1 = cx + R * Math.cos(startAngle + gap / R)
                const y1 = cy + R * Math.sin(startAngle + gap / R)
                const x2 = cx + R * Math.cos(endAngle   - gap / R)
                const y2 = cy + R * Math.sin(endAngle   - gap / R)
                const lg = a.pct > 0.5 ? 1 : 0
                const d  = `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${lg} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
                return <path key={i} d={d} fill="none" strokeWidth={20} stroke={a.color} strokeLinecap="round" />
              })}
              <text x={cx} y={cy - 6}  textAnchor="middle" fontSize={14} fontWeight={700} fill="#44403c">{formatDuration(total)}</text>
              <text x={cx} y={cy + 10} textAnchor="middle" fontSize={9}  fill="#a8a29e">this week</text>
            </svg>
          </div>
          {/* Legend */}
          <div className="flex-1 space-y-2.5">
            {arcs.map(a => (
              <div key={a.id} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                <span className="text-sm text-stone-600 dark:text-stone-300 flex-1">{a.name}</span>
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-200 tabular-nums">{Math.round(a.pct * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// V10 — Monthly Calendar
function DashboardV10MonthlyCalendar() {
  const dayNames = ['Mo','Tu','We','Th','Fr','Sa','Su']
  const levelClasses = [
    'bg-stone-100 dark:bg-stone-800 text-stone-300 dark:text-stone-600',
    'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-500',
    'bg-indigo-300 dark:bg-indigo-700/60 text-white',
    'bg-indigo-500 text-white',
    'bg-indigo-700 text-white',
  ]
  // Feb 2026 starts on Sunday, show Mon-Sun so offset = 6 (Mon=1, Sun=7; Sun=0 → offset 6)
  const offset = 6
  const today  = 25 // Feb 25

  return (
    <div className="max-w-sm mx-auto">
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200">February 2026</h3>
          <Badge variant="secondary">13 active days</Badge>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayNames.map(d => (
            <div key={d} className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 text-center">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {/* Blank offset cells */}
          {Array.from({ length: offset }, (_, i) => <div key={`b${i}`} />)}
          {/* Day cells */}
          {FEB_LEVELS.map((level, i) => {
            const day     = i + 1
            const isToday = day === today
            return (
              <div
                key={day}
                className={cn(
                  'aspect-square rounded-lg flex items-center justify-center text-[10px] font-semibold transition-all cursor-default',
                  levelClasses[level],
                  isToday && 'ring-2 ring-indigo-500 ring-offset-1'
                )}
              >
                {day}
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-2 mt-4 justify-end">
          <span className="text-[10px] text-stone-400">Less</span>
          {levelClasses.map((c, i) => <div key={i} className={cn('w-3 h-3 rounded-sm', c.split(' ')[0])} />)}
          <span className="text-[10px] text-stone-400">More</span>
        </div>
      </div>
    </div>
  )
}

// V11 — Three-Period Comparison
function DashboardV11ThreePeriods() {
  const periods = [
    { label: 'Today',      hours: 3.25, target: 8,    entries: 2,  pct: 0.406, trend: '+18%', trendUp: true  },
    { label: 'This Week',  hours: 17.5, target: 40,   entries: 10, pct: 0.438, trend: '+12%', trendUp: true  },
    { label: 'This Month', hours: 62,   target: 176,  entries: 38, pct: 0.352, trend: '-5%',  trendUp: false },
  ]

  return (
    <div className="max-w-2xl mx-auto">
      <div className="grid grid-cols-3 gap-4">
        {periods.map(p => (
          <div key={p.label} className="bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">{p.label}</span>
              <Badge className={cn('text-[10px] border-0', p.trendUp ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400')}>
                {p.trend}
              </Badge>
            </div>
            <div>
              <div className="text-3xl font-black text-stone-800 dark:text-stone-100 tabular-nums">{p.hours}<span className="text-base font-normal text-stone-400 dark:text-stone-500 ml-1">h</span></div>
              <div className="text-xs text-stone-400 dark:text-stone-500">of {p.target}h target</div>
            </div>
            <div className="h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${p.pct * 100}%` }} />
            </div>
            <div className="text-xs text-stone-400 dark:text-stone-500">{p.entries} entries</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// V12 — Earnings Dashboard
function DashboardV12Earnings() {
  const totalEarnings = EARNINGS_PROJECTS.reduce((s, p) => s + (p.weekMs / 3600000) * p.rate, 0)
  const sparklineData = [120, 0, 280, 240, 0, 0, 350]

  const W = 120, H = 36
  const maxS = Math.max(...sparklineData)
  const sparkPts = sparklineData.map((v, i) => ({
    x: (i / (sparklineData.length - 1)) * W,
    y: H - (v / maxS) * (H - 4),
  }))
  const sparkLine = sparkPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Hero card */}
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-2xl p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-stone-400 dark:text-stone-500">Earnings this week</p>
          <p className="text-3xl font-black text-stone-800 dark:text-stone-100">${totalEarnings.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
          <Badge className="mt-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-0">↑ 8% vs last week</Badge>
        </div>
        <div>
          <p className="text-[10px] text-stone-400 dark:text-stone-500 mb-1">Daily</p>
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
            <polyline points={sparkLine} fill="none" stroke="#6366f1" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {sparkPts.map((p, i) => sparklineData[i] > 0 && <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="#6366f1" />)}
          </svg>
        </div>
      </div>

      {/* Per-project */}
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-2xl p-5 space-y-3">
        <p className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">By project</p>
        {EARNINGS_PROJECTS.map(p => {
          const earned = (p.weekMs / 3600000) * p.rate
          const pct    = earned / totalEarnings
          return (
            <div key={p.id} className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
              <span className="text-sm text-stone-700 dark:text-stone-200 flex-1">{p.name}</span>
              <span className="text-xs text-stone-400 dark:text-stone-500">{formatDuration(p.weekMs)} × ${p.rate}/h</span>
              <span className="text-sm font-bold text-stone-700 dark:text-stone-200 w-20 text-right tabular-nums">
                ${earned.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
              <div className="w-16 h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, backgroundColor: p.color }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// V13 — Stacked Bar Chart (CSS, 7 days × projects)
function DashboardV13StackedBars() {
  const BAR_H = 160
  const days  = MOCK_WEEK_DAYS.map((d, di) => ({
    ...d,
    projects: MOCK_PROJECTS.map(p => ({
      ...p,
      ms: MOCK_ENTRIES.filter(e => e.date === ['2026-02-20','2026-02-21','2026-02-22','2026-02-23','2026-02-24','2026-02-25','2026-02-26'][di] && e.projectId === p.id)
        .reduce((s, e) => s + e.durationMs, 0),
    })).filter(p => p.ms > 0),
  }))
  const maxMs = Math.max(...days.map(d => d.projects.reduce((s, p) => s + p.ms, 0)), 28800000)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Weekly breakdown by project</h3>
          <div className="flex flex-wrap gap-2">
            {MOCK_PROJECTS.filter(p => MOCK_ENTRIES.some(e => e.projectId === p.id)).map(p => (
              <div key={p.id} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-[10px] text-stone-500 dark:text-stone-400">{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-end gap-2">
          {days.map((day, i) => {
            const totalMs  = day.projects.reduce((s, p) => s + p.ms, 0)
            const barH     = (totalMs / maxMs) * BAR_H
            const isToday  = i === 5
            const isWork   = day.targetMs > 0
            return (
              <div key={day.label} className={cn('flex-1 flex flex-col items-center gap-1.5', !isWork && 'opacity-35')}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-full flex flex-col-reverse rounded-xl overflow-hidden cursor-default"
                           style={{ height: BAR_H, backgroundColor: '#f5f5f4' }}>
                        {day.projects.map(p => (
                          <div key={p.id} style={{ height: (p.ms / maxMs) * BAR_H, backgroundColor: p.color }} />
                        ))}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p className="font-semibold">{day.label}: {formatDuration(totalMs)}</p>
                      {day.projects.map(p => <p key={p.id} className="text-[10px]">{p.name}: {formatDuration(p.ms)}</p>)}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span className={cn('text-[10px] font-medium', isToday ? 'text-indigo-500' : 'text-stone-400 dark:text-stone-500')}>{day.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// V14 — Focus Type Analytics
function DashboardV14FocusAnalytics() {
  const categories = [
    { label: 'Deep Work',  color: '#6366f1', ids: ['p1','p2','p6'], icon: '🧠' },
    { label: 'Design',     color: '#f59e0b', ids: ['p3'],           icon: '🎨' },
    { label: 'Meetings',   color: '#ef4444', ids: ['p4'],           icon: '💬' },
    { label: 'Planning',   color: '#8b5cf6', ids: ['p5'],           icon: '📋' },
  ]
  const catStats = categories.map(c => ({
    ...c,
    ms: MOCK_ENTRIES.filter(e => e.projectId && c.ids.includes(e.projectId)).reduce((s, e) => s + e.durationMs, 0),
  })).filter(c => c.ms > 0)
  const totalMs    = catStats.reduce((s, c) => s + c.ms, 0)
  const deepWork   = catStats.find(c => c.label === 'Deep Work')
  const focusRatio = deepWork ? Math.round((deepWork.ms / totalMs) * 100) : 0

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Focus analytics</h3>
          <Badge className={cn('border-0', focusRatio >= 60 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400')}>
            {focusRatio}% deep work
          </Badge>
        </div>

        {/* Horizontal stacked bar */}
        <div className="h-5 flex rounded-xl overflow-hidden gap-0.5">
          {catStats.map(c => (
            <TooltipProvider key={c.label}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="h-full transition-all cursor-default" style={{ width: `${(c.ms / totalMs) * 100}%`, backgroundColor: c.color }} />
                </TooltipTrigger>
                <TooltipContent>{c.label}: {formatDuration(c.ms)} ({Math.round((c.ms / totalMs) * 100)}%)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>

        {/* Category rows */}
        {catStats.map(c => (
          <div key={c.label} className="flex items-center gap-3">
            <span className="text-lg">{c.icon}</span>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-stone-700 dark:text-stone-200">{c.label}</span>
                <span className="text-sm font-bold tabular-nums text-stone-700 dark:text-stone-200">{formatDuration(c.ms)}</span>
              </div>
              <div className="h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(c.ms / totalMs) * 100}%`, backgroundColor: c.color }} />
              </div>
            </div>
          </div>
        ))}

        <p className="text-xs text-stone-400 dark:text-stone-500">
          {focusRatio >= 60 ? '✨ Great focus ratio! Meetings are under control.' : '⚠ Consider blocking focus time to reduce interruptions.'}
        </p>
      </div>
    </div>
  )
}

// V15 — Recent Activity Feed with Quick-Start
function DashboardV15ActivityFeed() {
  const [starting, setStarting] = useState<string | null>(null)
  const recent = MOCK_ENTRIES.slice(0, 6)

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Today summary strip */}
      <div className="flex items-center gap-4 bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-2xl px-5 py-3">
        <div className="flex-1">
          <p className="text-xs text-stone-400 dark:text-stone-500">Today so far</p>
          <p className="text-lg font-bold text-stone-800 dark:text-stone-100">3h 15m</p>
        </div>
        <div className="h-8 w-px bg-stone-100 dark:bg-stone-800" />
        <div className="flex-1">
          <p className="text-xs text-stone-400 dark:text-stone-500">Last entry</p>
          <p className="text-sm font-medium text-stone-700 dark:text-stone-200 truncate">Daily standup</p>
        </div>
        <Button size="sm" className="bg-indigo-500 hover:bg-indigo-600 text-white gap-1.5">
          <Play className="h-3.5 w-3.5" /> New
        </Button>
      </div>

      {/* Feed */}
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-2xl divide-y divide-stone-50 dark:divide-stone-800 overflow-hidden">
        <div className="px-4 py-2.5 bg-stone-50 dark:bg-stone-800/40">
          <p className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Recent entries</p>
        </div>
        {recent.map(entry => {
          const proj    = getProject(entry.projectId)
          const isStart = starting === entry.id
          return (
            <div key={entry.id} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/30 group transition-colors">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: proj?.color ?? '#d1d5db' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-700 dark:text-stone-200 truncate">{entry.description}</p>
                <p className="text-[10px] text-stone-400 dark:text-stone-500">{proj?.name ?? 'No project'} · {formatHour(entry.startHour)}</p>
              </div>
              <span className="text-sm font-bold text-stone-600 dark:text-stone-300 tabular-nums">{formatDuration(entry.durationMs)}</span>
              <button
                onClick={() => setStarting(isStart ? null : entry.id)}
                className={cn(
                  'opacity-0 group-hover:opacity-100 transition-all text-[10px] font-medium px-2 py-1 rounded-lg flex items-center gap-1',
                  isStart ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                )}
              >
                {isStart ? <><Check className="h-3 w-3" /> Started</> : <><Play className="h-3 w-3" /> Repeat</>}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// V16 — Radial Project Arcs (concentric SVG rings)
function DashboardV16RadialArcs() {
  const weekStats = MOCK_PROJECTS.map(p => ({
    ...p,
    ms:      MOCK_ENTRIES.filter(e => e.projectId === p.id).reduce((s, e) => s + e.durationMs, 0),
    targetMs: 14400000, // 4h target per project per week
  })).filter(p => p.ms > 0)

  const cx = 90, cy = 90
  const baseR = 28
  const gap   = 16

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200 mb-4">Project rings — progress vs 4h weekly goal</h3>
        <div className="flex items-center gap-6">
          <div className="shrink-0">
            <svg width={180} height={180}>
              {weekStats.map((p, i) => {
                const r    = baseR + i * gap
                const circ = 2 * Math.PI * r
                const pct  = Math.min(p.ms / p.targetMs, 1)
                return (
                  <g key={p.id}>
                    <circle cx={cx} cy={cy} r={r} fill="none" strokeWidth={10} stroke="#f1f0ef" className="dark:stroke-stone-800" />
                    <circle cx={cx} cy={cy} r={r} fill="none" strokeWidth={10} strokeLinecap="round"
                      stroke={p.color}
                      strokeDasharray={circ}
                      strokeDashoffset={circ * (1 - pct)}
                      style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
                    />
                  </g>
                )
              })}
            </svg>
          </div>
          <div className="flex-1 space-y-3">
            {weekStats.map(p => (
              <div key={p.id} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-stone-600 dark:text-stone-300">{p.name}</span>
                    <span className="text-xs text-stone-400 dark:text-stone-500 tabular-nums">{formatDuration(p.ms)}</span>
                  </div>
                  <div className="text-[10px] text-stone-400 dark:text-stone-500">{Math.round(Math.min(p.ms / p.targetMs, 1) * 100)}% of 4h goal</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 5 — PROJECT PICKER
// ════════════════════════════════════════════════════════════════════════════

function PickerV1ColorGrid() {
  const [selected, setSelected] = useState<string | null>(null)
  return (
    <div className="max-w-sm mx-auto space-y-5">
      <p className="text-sm text-stone-500 dark:text-stone-400 text-center">Color grid — instant recognition, no reading required</p>
      <div className="flex flex-wrap gap-3 justify-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setSelected(null)}
                className={cn(
                  'w-14 h-14 rounded-2xl border-2 flex items-center justify-center text-sm font-bold text-stone-400 dark:text-stone-500 transition-all hover:scale-105',
                  selected === null ? 'border-indigo-400 ring-2 ring-indigo-400 ring-offset-2 scale-105' : 'border-stone-200 dark:border-stone-700'
                )}
              >—</button>
            </TooltipTrigger>
            <TooltipContent>No project</TooltipContent>
          </Tooltip>
          {MOCK_PROJECTS.map(p => (
            <Tooltip key={p.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setSelected(p.id)}
                  className={cn('w-14 h-14 rounded-2xl flex items-center justify-center text-sm font-bold text-white transition-all hover:scale-105', selected === p.id && 'ring-2 ring-indigo-400 ring-offset-2 scale-110')}
                  style={{ backgroundColor: p.color }}
                >
                  {p.name.slice(0, 2).toUpperCase()}
                </button>
              </TooltipTrigger>
              <TooltipContent>{p.name}</TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
      {selected && (
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-stone-400 dark:text-stone-500">Selected:</span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: getProject(selected)?.color }}>
            {getProject(selected)?.name}
          </span>
        </div>
      )}
    </div>
  )
}

function PickerV2SearchableDropdown() {
  const [open,     setOpen]     = useState(false)
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const proj     = getProject(selected ?? '')
  const filtered = MOCK_PROJECTS.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="max-w-xs mx-auto space-y-3">
      <p className="text-sm text-stone-500 dark:text-stone-400 text-center">Searchable dropdown — great for many projects</p>
      <div className="relative">
        <button
          className="w-full flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] rounded-xl text-sm text-left hover:border-stone-300 transition-colors"
          onClick={() => setOpen(!open)}
        >
          {proj ? (
            <>
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: proj.color }} />
              <span className="flex-1 text-stone-700 dark:text-stone-200">{proj.name}</span>
            </>
          ) : (
            <span className="flex-1 text-stone-400 dark:text-stone-500">Select project…</span>
          )}
          <ChevronDown className={cn('h-4 w-4 text-stone-400 transition-transform duration-200', open && 'rotate-180')} />
        </button>

        {open && (
          <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] rounded-xl shadow-xl overflow-hidden">
            <div className="p-2 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2 px-2 py-1 bg-stone-50 dark:bg-stone-800 rounded-lg">
                <Search className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                <input
                  className="flex-1 bg-transparent text-xs outline-none text-stone-700 dark:text-stone-200 placeholder-stone-400"
                  placeholder="Search projects…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto py-1">
              <button
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-stone-50 dark:hover:bg-stone-800/50 text-sm text-stone-400 dark:text-stone-500 text-left"
                onClick={() => { setSelected(null); setOpen(false); setSearch('') }}
              >
                — No project
              </button>
              {filtered.map(p => (
                <button
                  key={p.id}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-stone-50 dark:hover:bg-stone-800/50 text-left"
                  onClick={() => { setSelected(p.id); setOpen(false); setSearch('') }}
                >
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="flex-1 text-sm text-stone-700 dark:text-stone-200">{p.name}</span>
                  {p.defaultTagName && <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">{p.defaultTagName}</Badge>}
                  {selected === p.id && <Check className="h-3.5 w-3.5 text-indigo-500 shrink-0" />}
                </button>
              ))}
              {filtered.length === 0 && <p className="px-3 py-3 text-xs text-stone-400 text-center">No projects found</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PickerV3SegmentedControl() {
  const [selected, setSelected] = useState<string | null>(null)
  const [showMore, setShowMore] = useState(false)
  const recent = MOCK_PROJECTS.slice(0, 3)
  const more   = MOCK_PROJECTS.slice(3)

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <p className="text-sm text-stone-500 dark:text-stone-400 text-center">Segmented control — speed-optimised for recent projects</p>
      <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 p-1 rounded-2xl">
        <button
          onClick={() => setSelected(null)}
          className={cn(
            'flex items-center justify-center px-3 h-8 text-xs font-medium rounded-xl transition-all',
            selected === null ? 'bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 shadow-sm' : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
          )}
        >
          None
        </button>
        {recent.map(p => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className={cn(
              'flex items-center gap-2 px-3 h-8 text-xs font-medium rounded-xl transition-all whitespace-nowrap',
              selected === p.id ? 'bg-indigo-500 text-white shadow-sm' : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
            )}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
          </button>
        ))}

        {/* Overflow */}
        <div className="relative ml-auto">
          <button
            onClick={() => setShowMore(!showMore)}
            className={cn(
              'flex items-center gap-1 px-3 h-8 text-xs font-medium rounded-xl transition-all',
              showMore ? 'bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 shadow-sm' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
            )}
          >
            +{more.length} more <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', showMore && 'rotate-180')} />
          </button>
          {showMore && (
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] rounded-xl shadow-lg py-1 z-10 min-w-[140px]">
              {more.map(p => (
                <button
                  key={p.id}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-stone-50 dark:hover:bg-stone-800/50 text-sm text-left"
                  onClick={() => { setSelected(p.id); setShowMore(false) }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-stone-700 dark:text-stone-200">{p.name}</span>
                  {selected === p.id && <Check className="h-3.5 w-3.5 text-indigo-500 ml-auto" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400">Selected:</span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: getProject(selected)?.color }}>
            {getProject(selected)?.name}
          </span>
        </div>
      )}
    </div>
  )
}

function PickerV4ProjectTagCombo() {
  const [projId, setProjId] = useState<string | null>(null)
  const [tagId,  setTagId]  = useState<string | null>(null)

  const projectTags: Record<string, Tag[]> = {
    p1: [MOCK_TAGS[0], MOCK_TAGS[2]],
    p2: [MOCK_TAGS[2]],
    p3: [MOCK_TAGS[1]],
    p4: [],
    p5: [MOCK_TAGS[2]],
    p6: [MOCK_TAGS[0]],
  }

  const availableTags = projId ? (projectTags[projId] ?? []) : []
  const proj          = getProject(projId ?? '')
  const tag           = MOCK_TAGS.find(t => t.id === tagId)

  return (
    <div className="max-w-sm mx-auto space-y-4">
      <p className="text-sm text-stone-500 dark:text-stone-400 text-center">Project + tag combo — linked tags slide in automatically</p>

      <div className="flex flex-wrap gap-2 justify-center">
        <TooltipProvider>
          {MOCK_PROJECTS.map(p => (
            <Tooltip key={p.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => { setProjId(projId === p.id ? null : p.id); setTagId(null) }}
                  className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-xs font-bold text-white transition-all hover:scale-105', projId === p.id ? 'ring-2 ring-indigo-400 ring-offset-2 scale-110' : 'opacity-80 hover:opacity-100')}
                  style={{ backgroundColor: p.color }}
                >
                  {p.name.slice(0, 2).toUpperCase()}
                </button>
              </TooltipTrigger>
              <TooltipContent>{p.name}</TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>

      {projId !== null && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Tag for {proj?.name}</p>
          <div className="flex gap-2 flex-wrap">
            {availableTags.length > 0 ? availableTags.map(t => (
              <button
                key={t.id}
                onClick={() => setTagId(tagId === t.id ? null : t.id)}
                className={cn('px-3 py-1.5 text-xs font-medium rounded-full border transition-all', tagId === t.id ? 'text-white border-transparent' : 'border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:border-stone-300')}
                style={tagId === t.id ? { backgroundColor: t.color } : {}}
              >
                {t.name}
              </button>
            )) : (
              <span className="text-xs text-stone-400 dark:text-stone-500 italic">No tags linked to this project</span>
            )}
          </div>
        </div>
      )}

      {projId && (
        <div>
          <p className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1.5">Selection</p>
          <div className="inline-flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 rounded-full pl-1 pr-2 py-1">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: proj?.color }} />
            <span className="text-xs font-medium text-stone-700 dark:text-stone-200">{proj?.name}</span>
            {tag && (
              <>
                <span className="text-stone-300 dark:text-stone-600">·</span>
                <span className="text-xs text-stone-500 dark:text-stone-400">{tag.name}</span>
              </>
            )}
            <button className="w-4 h-4 flex items-center justify-center text-stone-400 hover:text-stone-600 ml-0.5" onClick={() => { setProjId(null); setTagId(null) }}>
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════

export default function UITestLab() {
  const [activeVariants, setActiveVariants] = useState<Record<string, number>>({
    entries:        1,
    timer:          1,
    timerImproved:  1,
    quickadd:       1,
    dashboard:      1,
    picker:         1,
    dailyGoal:      1,
    dailyGoalHoriz: 1,
  })

  function setVariant(tab: string, v: number) {
    setActiveVariants(prev => ({ ...prev, [tab]: v }))
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FlaskConical className="h-5 w-5 text-indigo-500" />
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">UI Test Lab</h1>
        </div>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Experimental design concepts — admin only. Pick a tab then a variant number to preview.
        </p>
      </div>

      <Tabs defaultValue="entries">
        <TabsList className="h-auto p-1.5 mb-8 w-full justify-start gap-0.5 overflow-x-auto">
          <TabsTrigger value="entries"   className="text-xs">Entries List</TabsTrigger>
          <TabsTrigger value="timer"     className="text-xs">Timer Widget</TabsTrigger>
          <TabsTrigger value="quickadd"  className="text-xs">Quick Add</TabsTrigger>
          <TabsTrigger value="dashboard" className="text-xs">Dashboard</TabsTrigger>
          <TabsTrigger value="picker"    className="text-xs">Project Picker</TabsTrigger>
          <TabsTrigger value="dailygoal" className="text-xs">Daily Goal</TabsTrigger>
        </TabsList>

        <TabsContent value="entries">
          <VariantPicker
            count={4}
            active={activeVariants.entries}
            labels={['Timeline Feed', 'Kanban Columns', 'Ultra-Minimal', 'Gantt Bars']}
            onSelect={v => setVariant('entries', v)}
          />
          {activeVariants.entries === 1 && <EntriesV1TimelineFeed />}
          {activeVariants.entries === 2 && <EntriesV2KanbanColumns />}
          {activeVariants.entries === 3 && <EntriesV3UltraMinimal />}
          {activeVariants.entries === 4 && <EntriesV4GanttBars />}
        </TabsContent>

        <TabsContent value="timer">
          <Tabs defaultValue="current">
            <TabsList className="w-full mb-5">
              <TabsTrigger value="current" className="flex-1">Current Designs</TabsTrigger>
              <TabsTrigger value="improved" className="flex-1">Mode Card Improvements</TabsTrigger>
            </TabsList>

            <TabsContent value="current">
              <VariantPicker
                count={9}
                active={activeVariants.timer}
                labels={[
                  'Single Big Button', 'Command Bar', 'Two-Step Card', 'Mode Pill Switcher',
                  'Three Mode Cards', 'Ring Timer', 'Mode Dropdown', 'Accordion Panels', 'Extension Popup',
                ]}
                onSelect={v => setVariant('timer', v)}
              />
              {activeVariants.timer === 1 && <TimerV1BigButton />}
              {activeVariants.timer === 2 && <TimerV2CommandBar />}
              {activeVariants.timer === 3 && <TimerV3TwoStep />}
              {activeVariants.timer === 4 && <TimerV4ModePills />}
              {activeVariants.timer === 5 && <TimerV5ThreeModeCards />}
              {activeVariants.timer === 6 && <TimerV6RingTimer />}
              {activeVariants.timer === 7 && <TimerV7ModeDropdown />}
              {activeVariants.timer === 8 && <TimerV8AccordionModes />}
              {activeVariants.timer === 9 && <TimerV9ExtensionPopup />}
            </TabsContent>

            <TabsContent value="improved">
              <VariantPicker
                count={3}
                active={activeVariants.timerImproved}
                labels={['Full-Card Forms', 'Unified Smart Form', 'Side-by-Side Panels']}
                onSelect={v => setVariant('timerImproved', v)}
              />
              {activeVariants.timerImproved === 1 && <TimerImprovedA />}
              {activeVariants.timerImproved === 2 && <TimerImprovedB />}
              {activeVariants.timerImproved === 3 && <TimerImprovedC />}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="quickadd">
          <VariantPicker
            count={4}
            active={activeVariants.quickadd}
            labels={['Inline Drawer', 'Floating Sheet', 'Natural Language', 'Duration-First Steps']}
            onSelect={v => setVariant('quickadd', v)}
          />
          {activeVariants.quickadd === 1 && <QuickAddV1InlineDrawer />}
          {activeVariants.quickadd === 2 && <QuickAddV2FloatingSheet />}
          {activeVariants.quickadd === 3 && <QuickAddV3NaturalLanguage />}
          {activeVariants.quickadd === 4 && <QuickAddV4DurationFirst />}
        </TabsContent>

        <TabsContent value="dashboard">
          <VariantPicker
            count={16}
            active={activeVariants.dashboard}
            labels={[
              'Today Focus',
              'Week Grid',
              'Project Leaderboard',
              'Activity Heatmap',
              'Daily Timeline',
              'Productivity Scorecard',
              'Streak & Habits',
              'Trend Line Chart',
              'Donut Chart',
              'Monthly Calendar',
              'Period Comparison',
              'Earnings Dashboard',
              'Stacked Bar Chart',
              'Focus Analytics',
              'Activity Feed',
              'Radial Project Arcs',
            ]}
            onSelect={v => setVariant('dashboard', v)}
          />
          {activeVariants.dashboard === 1  && <DashboardV1TodayFocus />}
          {activeVariants.dashboard === 2  && <DashboardV2WeekGrid />}
          {activeVariants.dashboard === 3  && <DashboardV3ProjectLeaderboard />}
          {activeVariants.dashboard === 4  && <DashboardV4Heatmap />}
          {activeVariants.dashboard === 5  && <DashboardV5DailyTimeline />}
          {activeVariants.dashboard === 6  && <DashboardV6Scorecard />}
          {activeVariants.dashboard === 7  && <DashboardV7StreakHabits />}
          {activeVariants.dashboard === 8  && <DashboardV8TrendLine />}
          {activeVariants.dashboard === 9  && <DashboardV9DonutChart />}
          {activeVariants.dashboard === 10 && <DashboardV10MonthlyCalendar />}
          {activeVariants.dashboard === 11 && <DashboardV11ThreePeriods />}
          {activeVariants.dashboard === 12 && <DashboardV12Earnings />}
          {activeVariants.dashboard === 13 && <DashboardV13StackedBars />}
          {activeVariants.dashboard === 14 && <DashboardV14FocusAnalytics />}
          {activeVariants.dashboard === 15 && <DashboardV15ActivityFeed />}
          {activeVariants.dashboard === 16 && <DashboardV16RadialArcs />}
        </TabsContent>

        <TabsContent value="picker">
          <VariantPicker
            count={4}
            active={activeVariants.picker}
            labels={['Color Grid', 'Searchable Dropdown', 'Segmented Control', 'Project + Tag Combo']}
            onSelect={v => setVariant('picker', v)}
          />
          {activeVariants.picker === 1 && <PickerV1ColorGrid />}
          {activeVariants.picker === 2 && <PickerV2SearchableDropdown />}
          {activeVariants.picker === 3 && <PickerV3SegmentedControl />}
          {activeVariants.picker === 4 && <PickerV4ProjectTagCombo />}
        </TabsContent>

        <TabsContent value="dailygoal">
          <Tabs defaultValue="standard">
            <TabsList className="w-full mb-5">
              <TabsTrigger value="standard"   className="flex-1">Standard (5 designs)</TabsTrigger>
              <TabsTrigger value="horizontal" className="flex-1">Horizontal (5 designs)</TabsTrigger>
            </TabsList>

            <TabsContent value="standard">
              <VariantPicker
                count={5}
                active={activeVariants.dailyGoal}
                labels={['Circular Arc Gauge', 'Segmented Hour Blocks', 'Vertical Bar + Milestones', 'Scorecard + Grade', 'Motivational Focus Card']}
                onSelect={v => setVariant('dailyGoal', v)}
              />
              {activeVariants.dailyGoal === 1 && <DailyGoalV1CircularArc />}
              {activeVariants.dailyGoal === 2 && <DailyGoalV2SegmentedBlocks />}
              {activeVariants.dailyGoal === 3 && <DailyGoalV3VerticalBar />}
              {activeVariants.dailyGoal === 4 && <DailyGoalV4Scorecard />}
              {activeVariants.dailyGoal === 5 && <DailyGoalV5FocusCard />}
            </TabsContent>

            <TabsContent value="horizontal">
              <VariantPicker
                count={5}
                active={activeVariants.dailyGoalHoriz}
                labels={['Wide Progress Bar', 'Milestone Journey', 'Compact Header Band', 'Pill Track + Hour Markers', 'Week Overview Strip']}
                onSelect={v => setVariant('dailyGoalHoriz', v)}
              />
              {activeVariants.dailyGoalHoriz === 1 && <DailyGoalH1WideBar />}
              {activeVariants.dailyGoalHoriz === 2 && <DailyGoalH2MilestoneJourney />}
              {activeVariants.dailyGoalHoriz === 3 && <DailyGoalH3HeaderBand />}
              {activeVariants.dailyGoalHoriz === 4 && <DailyGoalH4PillTrack />}
              {activeVariants.dailyGoalHoriz === 5 && <DailyGoalH5WeekStrip />}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  )
}
