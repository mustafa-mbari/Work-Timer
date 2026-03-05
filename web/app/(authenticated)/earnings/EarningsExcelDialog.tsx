'use client'

import { useState } from 'react'
import { Table2, Loader2, Calendar } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import type { EarningsReport } from '@/lib/services/earnings'
import { generateEarningsExcel, type EarningsExcelOptions } from '@/lib/excel/earningsReport'
import type { ExportQuotaItem } from '@/lib/shared/types'
import ExportQuotaBadge from './ExportQuotaBadge'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: EarningsReport
  groupBy: 'tag' | 'project'
  dateRange?: { from?: string; to?: string }
  onTrackExport: () => Promise<boolean>
  quotaItem?: ExportQuotaItem
}

type Language = 'en' | 'de'

function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const QUICK_RANGES = [
  { label: 'This Week', getRange: () => {
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((day + 6) % 7))
    return { from: toIsoDate(monday), to: toIsoDate(now) }
  }},
  { label: 'Last Week', getRange: () => {
    const now = new Date()
    const day = now.getDay()
    const lastMonday = new Date(now)
    lastMonday.setDate(now.getDate() - ((day + 6) % 7) - 7)
    const lastSunday = new Date(lastMonday)
    lastSunday.setDate(lastMonday.getDate() + 6)
    return { from: toIsoDate(lastMonday), to: toIsoDate(lastSunday) }
  }},
  { label: 'This Month', getRange: () => {
    const now = new Date()
    const first = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: toIsoDate(first), to: toIsoDate(now) }
  }},
  { label: 'Last Month', getRange: () => {
    const now = new Date()
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const last = new Date(now.getFullYear(), now.getMonth(), 0)
    return { from: toIsoDate(first), to: toIsoDate(last) }
  }},
] as const

function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function EarningsExcelDialog({ open, onOpenChange, data, groupBy, dateRange, onTrackExport, quotaItem }: Props) {
  // Group by (independent from the page's current view)
  const [excelGroupBy, setExcelGroupBy] = useState<'tag' | 'project'>(groupBy)

  // Sheets to include
  const [includeSummary, setIncludeSummary] = useState(true)
  const [includeMainTable, setIncludeMainTable] = useState(true)
  const [includeDailyBreakdown, setIncludeDailyBreakdown] = useState(false)

  // Formatting
  const [language, setLanguage] = useState<Language>('en')

  // Date range override for Excel
  const [excelDateRange, setExcelDateRange] = useState<{ from?: string; to?: string }>({
    from: dateRange?.from,
    to: dateRange?.to,
  })

  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setGenerating(true)
    setError(null)

    // Check quota before the expensive fetch+generate
    const allowed = await onTrackExport()
    if (!allowed) {
      setError('Monthly Excel export limit reached. Resets on the 1st of next month.')
      setGenerating(false)
      return
    }

    try {
      const options: EarningsExcelOptions = {
        includeSummary,
        includeMainTable,
        includeDailyBreakdown,
        language,
      }

      // Fetch fresh data for the selected range + groupBy
      const params = new URLSearchParams()
      if (excelDateRange.from) params.set('dateFrom', excelDateRange.from)
      if (excelDateRange.to) params.set('dateTo', excelDateRange.to)
      params.set('groupBy', excelGroupBy)

      const res = await fetch(`/api/earnings?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch earnings data')
      const freshData: EarningsReport = await res.json()

      await generateEarningsExcel(freshData, excelGroupBy, excelDateRange, options)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate Excel file')
    } finally {
      setGenerating(false)
    }
  }

  const periodDisplay =
    excelDateRange.from && excelDateRange.to
      ? `${formatDateDisplay(excelDateRange.from)} \u2013 ${formatDateDisplay(excelDateRange.to)}`
      : 'All Time'

  const nothingSelected = !includeSummary && !includeMainTable && !includeDailyBreakdown

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-lg">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
              <Table2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            Export Earnings as Excel
          </DialogTitle>
          <DialogDescription>
            Configure which sheets to include in your .xlsx file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-1">
          {/* ── Date Range ── */}
          <div className="rounded-xl border border-stone-200 dark:border-[var(--dark-border)] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-stone-400" />
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                Date Range
              </span>
            </div>

            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              {periodDisplay}
            </p>

            <div className="flex flex-wrap gap-1.5">
              {QUICK_RANGES.map(qr => (
                <button
                  key={qr.label}
                  onClick={() => setExcelDateRange(qr.getRange())}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg border border-stone-200 dark:border-[var(--dark-border)] text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)] transition-colors"
                >
                  {qr.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={excelDateRange.from ?? ''}
                onChange={e => setExcelDateRange(prev => ({ ...prev, from: e.target.value || undefined }))}
                className="flex-1 h-8 text-sm"
                aria-label="From date"
              />
              <span className="text-stone-400 text-sm select-none shrink-0">&ndash;</span>
              <Input
                type="date"
                value={excelDateRange.to ?? ''}
                onChange={e => setExcelDateRange(prev => ({ ...prev, to: e.target.value || undefined }))}
                className="flex-1 h-8 text-sm"
                aria-label="To date"
              />
              {(excelDateRange.from || excelDateRange.to) && (
                <button
                  onClick={() => setExcelDateRange({ from: undefined, to: undefined })}
                  className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors shrink-0"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <Separator />

          {/* ── Group By ── */}
          <div>
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Group By
            </span>
            <div className="mt-2 flex gap-1.5">
              {(['tag', 'project'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setExcelGroupBy(g)}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    excelGroupBy === g
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                      : 'border-stone-200 dark:border-[var(--dark-border)] text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)]'
                  }`}
                >
                  By {g === 'tag' ? 'Tag' : 'Project'}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* ── Sheets ── */}
          <div>
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Sheets
            </span>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox checked={includeSummary} onCheckedChange={v => setIncludeSummary(!!v)} />
                <div>
                  <span className="text-sm text-stone-700 dark:text-stone-300">Summary Sheet</span>
                  <p className="text-xs text-stone-400 dark:text-stone-500">Totals, rate, currency</p>
                </div>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox checked={includeMainTable} onCheckedChange={v => setIncludeMainTable(!!v)} />
                <div>
                  <span className="text-sm text-stone-700 dark:text-stone-300">Earnings Table</span>
                  <p className="text-xs text-stone-400 dark:text-stone-500">
                    Breakdown by {excelGroupBy}
                  </p>
                </div>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox
                  checked={includeDailyBreakdown}
                  onCheckedChange={v => setIncludeDailyBreakdown(!!v)}
                  disabled={!data.daily_earnings?.length}
                />
                <div>
                  <span className={`text-sm ${data.daily_earnings?.length ? 'text-stone-700 dark:text-stone-300' : 'text-stone-400 dark:text-stone-500'}`}>
                    Daily Breakdown
                  </span>
                  <p className="text-xs text-stone-400 dark:text-stone-500">Day-by-day per {excelGroupBy}</p>
                </div>
              </label>
            </div>
          </div>

          <Separator />

          {/* ── Language ── */}
          <div>
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Language
            </span>
            <div className="mt-2 flex gap-1.5 w-48">
              {([['en', 'EN'], ['de', 'DE']] as const).map(([val, lbl]) => (
                <button
                  key={val}
                  onClick={() => setLanguage(val)}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    language === val
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                      : 'border-stone-200 dark:border-[var(--dark-border)] text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)]'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-rose-500 dark:text-rose-400 mt-2">{error}</p>
        )}

        {quotaItem && (
          <div className="flex items-center justify-between text-xs text-stone-400 dark:text-stone-500 px-1 mt-3">
            <span>Excel exports this month</span>
            <ExportQuotaBadge item={quotaItem} loading={false} />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generating || nothingSelected || quotaItem?.remaining === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Table2 className="h-4 w-4 mr-2" />
                Export Excel
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
