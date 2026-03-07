'use client'

import { useState } from 'react'
import { FileText, Loader2, ChevronDown, ChevronUp, Calendar } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import type { EarningsReport } from '@/lib/services/earnings'
import type { EarningsPdfOptions } from '@/lib/pdf/earningsReport'
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

type PageSize = 'a4' | 'letter'
type Orientation = 'portrait' | 'landscape'
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

export default function EarningsExportDialog({ open, onOpenChange, data, groupBy, dateRange, onTrackExport, quotaItem }: Props) {
  // Group by (can differ from the page's current view)
  const [pdfGroupBy, setPdfGroupBy] = useState<'tag' | 'project'>(groupBy)

  // Content toggles
  const [includeSummary, setIncludeSummary] = useState(true)
  const [includeTable, setIncludeTable] = useState(true)
  const [includeDailyChart, setIncludeDailyChart] = useState(false)
  const [includeDailyBreakdown, setIncludeDailyBreakdown] = useState(false)
  const [includeTagBreakdown, setIncludeTagBreakdown] = useState(false)
  const [onlyWorkDays, setOnlyWorkDays] = useState(false)

  // Formatting
  const [pageSize, setPageSize] = useState<PageSize>('a4')
  const [orientation, setOrientation] = useState<Orientation>('portrait')
  const [language, setLanguage] = useState<Language>('en')
  const [showColors, setShowColors] = useState(true)

  // Additional info
  const [showAdditional, setShowAdditional] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [reportNumber, setReportNumber] = useState('')

  // Date range override for PDF
  const [pdfDateRange, setPdfDateRange] = useState<{ from?: string; to?: string }>({
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
      setError('Monthly PDF export limit reached. Resets on the 1st of next month.')
      setGenerating(false)
      return
    }

    try {
      const options: EarningsPdfOptions = {
        includeSummary,
        includeTable,
        includeDailyChart,
        includeDailyBreakdown,
        includeTagBreakdown,
        onlyWorkDays,
        pageSize,
        orientation,
        language,
        showColors,
        companyName: companyName.trim() || undefined,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        reportNumber: reportNumber.trim() || undefined,
      }

      // Always fetch fresh earnings data matching the selected date range
      const params = new URLSearchParams()
      if (pdfDateRange.from) params.set('dateFrom', pdfDateRange.from)
      if (pdfDateRange.to) params.set('dateTo', pdfDateRange.to)
      params.set('groupBy', pdfGroupBy)

      const res = await fetch(`/api/earnings?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch earnings data')
      const freshData: EarningsReport = await res.json()

      // If tag breakdown requested and pdfGroupBy is project, fetch tag data too
      let tagData: EarningsReport | null = null
      if (includeTagBreakdown && pdfGroupBy === 'project') {
        const tagParams = new URLSearchParams()
        if (pdfDateRange.from) tagParams.set('dateFrom', pdfDateRange.from)
        if (pdfDateRange.to) tagParams.set('dateTo', pdfDateRange.to)
        tagParams.set('groupBy', 'tag')

        const tagRes = await fetch(`/api/earnings?${tagParams.toString()}`)
        if (tagRes.ok) {
          tagData = await tagRes.json()
        }
      }

      const { generateEarningsPdf } = await import('@/lib/pdf/earningsReport')
      await generateEarningsPdf(freshData, pdfGroupBy, pdfDateRange, options, tagData)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PDF')
    } finally {
      setGenerating(false)
    }
  }

  const periodDisplay = pdfDateRange.from && pdfDateRange.to
    ? `${formatDateDisplay(pdfDateRange.from)} \u2013 ${formatDateDisplay(pdfDateRange.to)}`
    : 'All Time'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-lg">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            </div>
            Export Earnings Report
          </DialogTitle>
          <DialogDescription>
            Configure what to include in your PDF report.
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

            {/* Quick range buttons */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_RANGES.map(qr => (
                <button
                  key={qr.label}
                  onClick={() => setPdfDateRange(qr.getRange())}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg border border-stone-200 dark:border-[var(--dark-border)] text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)] transition-colors"
                >
                  {qr.label}
                </button>
              ))}
            </div>

            {/* Custom date range inputs */}
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={pdfDateRange.from ?? ''}
                onChange={e => setPdfDateRange(prev => ({ ...prev, from: e.target.value || undefined }))}
                className="flex-1 h-8 text-sm"
                aria-label="From date"
              />
              <span className="text-stone-400 text-sm select-none shrink-0">&ndash;</span>
              <Input
                type="date"
                value={pdfDateRange.to ?? ''}
                onChange={e => setPdfDateRange(prev => ({ ...prev, to: e.target.value || undefined }))}
                className="flex-1 h-8 text-sm"
                aria-label="To date"
              />
              {(pdfDateRange.from || pdfDateRange.to) && (
                <button
                  onClick={() => setPdfDateRange({ from: undefined, to: undefined })}
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
                  onClick={() => { setPdfGroupBy(g); if (g === 'tag') setIncludeTagBreakdown(false) }}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors capitalize ${
                    pdfGroupBy === g
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

          {/* ── Content Sections ── */}
          <div>
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Content
            </span>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox checked={includeSummary} onCheckedChange={(v) => setIncludeSummary(!!v)} />
                <div>
                  <span className="text-sm text-stone-700 dark:text-stone-300">Include Summary</span>
                  <p className="text-xs text-stone-400 dark:text-stone-500">Grand Total, Hours, Avg Rate</p>
                </div>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox checked={includeTable} onCheckedChange={(v) => setIncludeTable(!!v)} />
                <div>
                  <span className="text-sm text-stone-700 dark:text-stone-300">Earnings Table</span>
                  <p className="text-xs text-stone-400 dark:text-stone-500">Breakdown by {pdfGroupBy}</p>
                </div>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox
                  checked={includeDailyChart}
                  onCheckedChange={(v) => setIncludeDailyChart(!!v)}
                  disabled={!data.daily_earnings?.length}
                />
                <div>
                  <span className={`text-sm ${data.daily_earnings?.length ? 'text-stone-700 dark:text-stone-300' : 'text-stone-400 dark:text-stone-500'}`}>
                    Daily Chart
                  </span>
                  <p className="text-xs text-stone-400 dark:text-stone-500">Stacked bar visualization</p>
                </div>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox
                  checked={includeDailyBreakdown}
                  onCheckedChange={(v) => setIncludeDailyBreakdown(!!v)}
                  disabled={!data.daily_earnings?.length}
                />
                <div>
                  <span className={`text-sm ${data.daily_earnings?.length ? 'text-stone-700 dark:text-stone-300' : 'text-stone-400 dark:text-stone-500'}`}>
                    Daily Breakdown
                  </span>
                  <p className="text-xs text-stone-400 dark:text-stone-500">Day-by-day detail table</p>
                </div>
              </label>
              {pdfGroupBy === 'project' && (
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox checked={includeTagBreakdown} onCheckedChange={(v) => setIncludeTagBreakdown(!!v)} />
                  <div>
                    <span className="text-sm text-stone-700 dark:text-stone-300">Earnings by Tag</span>
                    <p className="text-xs text-stone-400 dark:text-stone-500">Additional tag breakdown</p>
                  </div>
                </label>
              )}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox checked={onlyWorkDays} onCheckedChange={(v) => setOnlyWorkDays(!!v)} />
                <div>
                  <span className="text-sm text-stone-700 dark:text-stone-300">Only Work Days</span>
                  <p className="text-xs text-stone-400 dark:text-stone-500">Exclude Sat &amp; Sun</p>
                </div>
              </label>
            </div>
          </div>

          <Separator />

          {/* ── Formatting Options ── */}
          <div>
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Formatting
            </span>
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                {/* Page Size */}
                <div>
                  <span className="text-xs text-stone-500 dark:text-stone-400 mb-1.5 block">Page Size</span>
                  <div className="flex gap-1.5">
                    {(['a4', 'letter'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setPageSize(s)}
                        className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          pageSize === s
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                            : 'border-stone-200 dark:border-[var(--dark-border)] text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)]'
                        }`}
                      >
                        {s.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Orientation */}
                <div>
                  <span className="text-xs text-stone-500 dark:text-stone-400 mb-1.5 block">Orientation</span>
                  <div className="flex gap-1.5">
                    {(['portrait', 'landscape'] as const).map(o => (
                      <button
                        key={o}
                        onClick={() => setOrientation(o)}
                        className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors capitalize ${
                          orientation === o
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                            : 'border-stone-200 dark:border-[var(--dark-border)] text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)]'
                        }`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Language */}
                <div>
                  <span className="text-xs text-stone-500 dark:text-stone-400 mb-1.5 block">Language</span>
                  <div className="flex gap-1.5">
                    {([['en', 'EN'], ['de', 'DE']] as const).map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => setLanguage(val)}
                        className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          language === val
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                            : 'border-stone-200 dark:border-[var(--dark-border)] text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Show Colors */}
                <div className="flex items-end pb-0.5">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <Checkbox checked={showColors} onCheckedChange={(v) => setShowColors(!!v)} />
                    <span className="text-sm text-stone-700 dark:text-stone-300">Show Colors in Tables</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Additional Information (collapsible) ── */}
          <div>
            <button
              onClick={() => setShowAdditional(!showAdditional)}
              className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider hover:text-stone-700 dark:hover:text-stone-300 transition-colors w-full"
            >
              Additional Information
              <span className="text-xs font-normal normal-case tracking-normal text-stone-400">(optional)</span>
              <span className="ml-auto">
                {showAdditional ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </span>
            </button>
            {showAdditional && (
              <div className="mt-3 space-y-3 rounded-xl border border-stone-200 dark:border-[var(--dark-border)] p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="company-name" className="text-xs text-stone-500 dark:text-stone-400">
                      Company / Personal Name
                    </Label>
                    <Input
                      id="company-name"
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      placeholder="John Doe or Acme Inc."
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city" className="text-xs text-stone-500 dark:text-stone-400">
                      City
                    </Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="Berlin, Germany"
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="address" className="text-xs text-stone-500 dark:text-stone-400">
                    Address
                  </Label>
                  <textarea
                    id="address"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="123 Main St, Suite 100"
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] px-3 py-1.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="report-number" className="text-xs text-stone-500 dark:text-stone-400">
                      Report Number
                    </Label>
                    <Input
                      id="report-number"
                      value={reportNumber}
                      onChange={e => setReportNumber(e.target.value)}
                      placeholder="INV-2026-001"
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes" className="text-xs text-stone-500 dark:text-stone-400">
                    Notes
                  </Label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Any additional notes for the report..."
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] px-3 py-1.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <p className="text-sm text-rose-500 dark:text-rose-400 mt-2">{error}</p>
        )}

        {quotaItem && (
          <div className="flex items-center justify-between text-xs text-stone-400 dark:text-stone-500 px-1 mt-3">
            <span>PDF exports this month</span>
            <ExportQuotaBadge item={quotaItem} loading={false} />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generating || (!includeSummary && !includeTable && !includeDailyChart && !includeDailyBreakdown && !includeTagBreakdown) || quotaItem?.remaining === 0}
            className="bg-indigo-500 hover:bg-indigo-600 text-white"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
