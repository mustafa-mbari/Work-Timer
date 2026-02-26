'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Check, Loader2, Calendar, Filter, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { GroupShare } from '@/lib/repositories/groupShares'

type PeriodType = 'month' | 'week' | 'day'

interface ProjectItem { id: string; name: string; color: string }
interface TagItem    { id: string; name: string; color: string }

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  groupId: string
  projects: ProjectItem[]
  tags: TagItem[]
  /** Pre-fill from a previous share (Re-share flow) */
  prefill?: Pick<GroupShare, 'period_type' | 'date_from' | 'date_to' | 'project_ids' | 'tag_ids'>
  onCreated: (share: GroupShare) => void
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function localIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function periodLabel(type: PeriodType, offset: number): string {
  const now = new Date()
  if (type === 'month') {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }
  if (type === 'week') {
    const mon = new Date(now)
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7) + offset * 7)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    return `${mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }
  // day
  const d = new Date(now); d.setDate(d.getDate() + offset)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function periodRange(type: PeriodType, offset: number): { from: string; to: string } {
  const now = new Date()
  if (type === 'month') {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    return { from: localIso(d), to: localIso(last) }
  }
  if (type === 'week') {
    const mon = new Date(now)
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7) + offset * 7)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    return { from: localIso(mon), to: localIso(sun) }
  }
  const d = new Date(now); d.setDate(d.getDate() + offset)
  return { from: localIso(d), to: localIso(d) }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShareWizard({ open, onOpenChange, groupId, projects, tags, prefill, onCreated }: Props) {
  const [step, setStep] = useState(1)

  // Step 1 state
  const [periodType, setPeriodType] = useState<PeriodType>(prefill?.period_type ?? 'month')
  const [periodOffset, setPeriodOffset] = useState(0)

  // Step 2 state
  const [selectedProjects, setSelectedProjects] = useState<string[] | null>(null) // null = all
  const [selectedTags, setSelectedTags]         = useState<string[] | null>(null) // null = all
  const [note, setNote] = useState('')

  // Step 3 state
  const [preview, setPreview] = useState<{ entry_count: number; total_hours: number } | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Apply prefill when dialog opens or prefill changes
  useEffect(() => {
    if (prefill) {
      setPeriodType(prefill.period_type)
      setSelectedProjects(prefill.project_ids)
      setSelectedTags(prefill.tag_ids)
      // Calculate the offset for the prefill period
      const now = new Date()
      if (prefill.period_type === 'month') {
        const from = new Date(prefill.date_from)
        const diff = (from.getFullYear() - now.getFullYear()) * 12 + (from.getMonth() - now.getMonth())
        setPeriodOffset(diff)
      } else {
        setPeriodOffset(0)
      }
    } else {
      setPeriodType('month')
      setPeriodOffset(0)
      setSelectedProjects(null)
      setSelectedTags(null)
      setNote('')
    }
    setStep(1)
    setPreview(null)
  }, [open, prefill])

  const range = periodRange(periodType, periodOffset)
  const label = periodLabel(periodType, periodOffset)

  function toggleProject(id: string) {
    if (selectedProjects === null) {
      // Was "all" → switch to all-except-this-one
      setSelectedProjects(projects.map(p => p.id).filter(p => p !== id))
    } else if (selectedProjects.includes(id)) {
      const next = selectedProjects.filter(p => p !== id)
      setSelectedProjects(next.length === 0 ? [] : next)
    } else {
      const next = [...selectedProjects, id]
      setSelectedProjects(next.length === projects.length ? null : next)
    }
  }

  function toggleTag(id: string) {
    if (selectedTags === null) {
      setSelectedTags(tags.map(t => t.id).filter(t => t !== id))
    } else if (selectedTags.includes(id)) {
      const next = selectedTags.filter(t => t !== id)
      setSelectedTags(next.length === 0 ? [] : next)
    } else {
      const next = [...selectedTags, id]
      setSelectedTags(next.length === tags.length ? null : next)
    }
  }

  function isProjectSelected(id: string) {
    return selectedProjects === null || selectedProjects.includes(id)
  }

  function isTagSelected(id: string) {
    return selectedTags === null || selectedTags.includes(id)
  }

  async function goToPreview() {
    setPreviewing(true)
    setStep(3)
    const res = await fetch(`/api/groups/${groupId}/shares/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period_type: periodType, date_from: range.from, date_to: range.to, project_ids: selectedProjects, tag_ids: selectedTags }),
    })
    setPreviewing(false)
    if (res.ok) setPreview(await res.json())
    else setPreview({ entry_count: 0, total_hours: 0 })
  }

  async function handleSubmit() {
    setSubmitting(true)
    const res = await fetch(`/api/groups/${groupId}/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        period_type: periodType,
        date_from: range.from,
        date_to: range.to,
        project_ids: selectedProjects,
        tag_ids: selectedTags,
        note: note.trim() || undefined,
      }),
    })
    setSubmitting(false)
    if (res.ok) {
      const share = await res.json()
      toast.success('Share created successfully')
      onCreated(share)
      onOpenChange(false)
    } else {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to create share')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 1 && <><Calendar className="h-4 w-4 text-indigo-500" /> Choose Period</>}
            {step === 2 && <><Filter className="h-4 w-4 text-indigo-500" /> Filter Data</>}
            {step === 3 && <><BarChart3 className="h-4 w-4 text-indigo-500" /> Preview & Share</>}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-2">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-indigo-500' : 'bg-stone-200 dark:bg-stone-700'
              }`}
            />
          ))}
        </div>

        {/* ── Step 1: Period ─────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5 pt-1">
            {/* Period type toggle */}
            <div className="flex gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
              {(['month', 'week', 'day'] as PeriodType[]).map(t => (
                <button
                  key={t}
                  onClick={() => { setPeriodType(t); setPeriodOffset(0) }}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-lg capitalize transition-colors ${
                    periodType === t
                      ? 'bg-white dark:bg-stone-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Period navigator */}
            <div className="flex items-center justify-between bg-stone-50 dark:bg-stone-800/50 rounded-xl px-4 py-3">
              <button
                onClick={() => setPeriodOffset(o => o - 1)}
                className="p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-stone-500" />
              </button>
              <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">{label}</span>
              <button
                onClick={() => setPeriodOffset(o => Math.min(0, o + 1))}
                disabled={periodOffset === 0}
                className="p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4 text-stone-500" />
              </button>
            </div>

            <p className="text-xs text-stone-400 dark:text-stone-500 text-center">
              {range.from} → {range.to}
            </p>

            <Button onClick={() => setStep(2)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
              Next: Filter Data →
            </Button>
          </div>
        )}

        {/* ── Step 2: Filters ─────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-4">
              {/* Projects */}
              <div>
                <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
                  Projects
                </p>
                <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                  {/* All toggle */}
                  <button
                    onClick={() => setSelectedProjects(null)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                      selectedProjects === null
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${
                      selectedProjects === null ? 'bg-indigo-500 border-indigo-500' : 'border-stone-300 dark:border-stone-600'
                    }`}>
                      {selectedProjects === null && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <span>All</span>
                  </button>
                  {projects.map(p => (
                    <button
                      key={p.id}
                      onClick={() => toggleProject(p.id)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                        isProjectSelected(p.id)
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                          : 'hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${
                        isProjectSelected(p.id) ? 'border-transparent' : 'border-stone-300 dark:border-stone-600'
                      }`} style={isProjectSelected(p.id) ? { background: p.color } : {}}>
                        {isProjectSelected(p.id) && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))}
                  {projects.length === 0 && (
                    <p className="text-xs text-stone-400 px-2.5">No projects</p>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div>
                <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
                  Tags
                </p>
                <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                  <button
                    onClick={() => setSelectedTags(null)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                      selectedTags === null
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${
                      selectedTags === null ? 'bg-indigo-500 border-indigo-500' : 'border-stone-300 dark:border-stone-600'
                    }`}>
                      {selectedTags === null && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <span>All</span>
                  </button>
                  {tags.map(t => (
                    <button
                      key={t.id}
                      onClick={() => toggleTag(t.id)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                        isTagSelected(t.id)
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                          : 'hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${
                        isTagSelected(t.id) ? 'border-transparent' : 'border-stone-300 dark:border-stone-600'
                      }`} style={isTagSelected(t.id) ? { background: t.color } : {}}>
                        {isTagSelected(t.id) && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <span className="truncate">{t.name}</span>
                    </button>
                  ))}
                  {tags.length === 0 && (
                    <p className="text-xs text-stone-400 px-2.5">No tags</p>
                  )}
                </div>
              </div>
            </div>

            {/* Note */}
            <div>
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">
                Note <span className="normal-case font-normal">(optional)</span>
              </p>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Add context for your team..."
                maxLength={280}
                rows={2}
                className="w-full text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-stone-800 dark:text-stone-100 placeholder:text-stone-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <p className="text-xs text-stone-400 text-right mt-0.5">{note.length}/280</p>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1 rounded-xl">
                ← Back
              </Button>
              <Button onClick={goToPreview} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
                Preview →
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Preview ─────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4 pt-1">
            {previewing ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                <p className="text-sm text-stone-400">Counting entries…</p>
              </div>
            ) : (
              <>
                {/* Summary card */}
                <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-5 space-y-3">
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">
                      {preview?.total_hours ?? 0}h
                    </span>
                    <span className="text-sm text-indigo-500 dark:text-indigo-400">
                      {preview?.entry_count ?? 0} {preview?.entry_count === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-stone-600 dark:text-stone-300">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-stone-400 flex-shrink-0" />
                      <span className="font-medium">{label}</span>
                      <span className="text-stone-400">({range.from} → {range.to})</span>
                    </div>

                    <div className="text-xs text-stone-500 dark:text-stone-400">
                      <span className="font-medium">Projects: </span>
                      {selectedProjects === null
                        ? 'All'
                        : selectedProjects.length === 0
                          ? 'None'
                          : projects.filter(p => selectedProjects.includes(p.id)).map(p => p.name).join(', ')}
                    </div>
                    <div className="text-xs text-stone-500 dark:text-stone-400">
                      <span className="font-medium">Tags: </span>
                      {selectedTags === null
                        ? 'All'
                        : selectedTags.length === 0
                          ? 'None'
                          : tags.filter(t => selectedTags.includes(t.id)).map(t => t.name).join(', ')}
                    </div>
                    {note && (
                      <div className="text-xs text-stone-500 dark:text-stone-400 italic">
                        "{note}"
                      </div>
                    )}
                  </div>
                </div>

                {preview?.entry_count === 0 && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
                    No entries found for this period and filters.
                  </p>
                )}
              </>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} disabled={submitting} className="flex-1 rounded-xl">
                ← Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || previewing || preview?.entry_count === 0}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-1.5"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {submitting ? 'Sharing…' : 'Share Now'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
