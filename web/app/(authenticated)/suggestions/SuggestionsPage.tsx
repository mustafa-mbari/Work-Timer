'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Lightbulb, Send, Loader2 } from 'lucide-react'

const SUGGESTION_TYPES = [
  { value: 'feature', label: 'New Feature' },
  { value: 'improvement', label: 'Improvement' },
  { value: 'integration', label: 'Integration' },
  { value: 'ui_ux', label: 'UI/UX' },
  { value: 'other', label: 'Other' },
]

const IMPORTANCE_LEVELS = [
  { value: 'nice_to_have', label: 'Nice to Have' },
  { value: 'important', label: 'Important' },
  { value: 'critical', label: 'Critical' },
]

const PLATFORMS = [
  { value: 'chrome_extension', label: 'Chrome Extension' },
  { value: 'web_app', label: 'Web Panel' },
  { value: 'both', label: 'Both' },
]

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
  under_review: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  planned: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  in_progress: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  implemented: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  declined: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
}

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  under_review: 'Under Review',
  planned: 'Planned',
  in_progress: 'In Progress',
  implemented: 'Implemented',
  declined: 'Declined',
}

const IMPORTANCE_COLORS: Record<string, string> = {
  nice_to_have: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
  important: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  critical: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
}

interface Suggestion {
  id: string
  title: string
  suggestion_type: string
  importance: string
  status: string
  target_platform: string
  created_at: string
}

interface Props {
  userEmail: string
  userName: string | null
}

export default function SuggestionsPage({ userEmail, userName }: Props) {
  const [suggestionType, setSuggestionType] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [importance, setImportance] = useState('important')
  const [targetPlatform, setTargetPlatform] = useState('both')
  const [notifyOnRelease, setNotifyOnRelease] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(true)

  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await fetch('/api/suggestions')
      if (res.ok) setSuggestions(await res.json())
    } catch {
      // silently fail
    } finally {
      setLoadingSuggestions(false)
    }
  }, [])

  useEffect(() => { fetchSuggestions() }, [fetchSuggestions])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!suggestionType || !title.trim() || !description.trim()) {
      toast.error('Please fill in all required fields')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestion_type: suggestionType,
          title: title.trim(),
          description: description.trim(),
          importance,
          target_platform: targetPlatform,
          notify_on_release: notifyOnRelease,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit suggestion')
      }
      toast.success('Suggestion submitted successfully')
      setSuggestionType('')
      setTitle('')
      setDescription('')
      setImportance('important')
      setTargetPlatform('both')
      setNotifyOnRelease(false)
      fetchSuggestions()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit suggestion')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Submit Suggestion Form */}
      <div className="bg-white dark:bg-[var(--dark-card)] rounded-2xl border border-stone-200 dark:border-[var(--dark-border)] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
            <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">Share a Feature Idea</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">Logged in as {userName || userEmail}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="suggestion-type">Suggestion Type *</Label>
              <Select value={suggestionType} onValueChange={setSuggestionType}>
                <SelectTrigger id="suggestion-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {SUGGESTION_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="importance">Importance</Label>
              <Select value={importance} onValueChange={setImportance}>
                <SelectTrigger id="importance">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPORTANCE_LEVELS.map(i => (
                    <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Idea Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Give your idea a descriptive title"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Detailed Description *</Label>
            <textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe your idea, what problem it solves, and how you imagine it working..."
              maxLength={5000}
              rows={5}
              className="flex w-full rounded-lg border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark)] px-3 py-2 text-sm text-stone-800 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-platform">Target Platform</Label>
            <Select value={targetPlatform} onValueChange={setTargetPlatform}>
              <SelectTrigger id="target-platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="notify"
              checked={notifyOnRelease}
              onCheckedChange={setNotifyOnRelease}
            />
            <Label htmlFor="notify" className="cursor-pointer text-sm text-stone-600 dark:text-stone-300">
              Notify me when this feature is released
            </Label>
          </div>

          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {submitting ? 'Submitting...' : 'Submit Suggestion'}
          </Button>
        </form>
      </div>

      {/* My Suggestions */}
      <div className="bg-white dark:bg-[var(--dark-card)] rounded-2xl border border-stone-200 dark:border-[var(--dark-border)] p-6">
        <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4">My Suggestions</h2>

        {loadingSuggestions ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
          </div>
        ) : suggestions.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400 text-center py-8">
            No suggestions submitted yet.
          </p>
        ) : (
          <div className="space-y-3">
            {suggestions.map(suggestion => (
              <div
                key={suggestion.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-xl border border-stone-100 dark:border-[var(--dark-border)] hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 dark:text-stone-100 truncate">
                    {suggestion.title}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {SUGGESTION_TYPES.find(t => t.value === suggestion.suggestion_type)?.label} &middot; {new Date(suggestion.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={IMPORTANCE_COLORS[suggestion.importance]}>
                    {IMPORTANCE_LEVELS.find(i => i.value === suggestion.importance)?.label}
                  </Badge>
                  <Badge variant="outline" className={STATUS_COLORS[suggestion.status]}>
                    {STATUS_LABELS[suggestion.status]}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
