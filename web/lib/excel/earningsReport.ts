import type { EarningsReport } from '@/lib/repositories/earnings'

// ── Types ─────────────────────────────────────────────

export interface EarningsExcelOptions {
  includeSummary: boolean
  includeMainTable: boolean
  includeDailyBreakdown: boolean
  language: 'en' | 'de'
}

// ── Labels ────────────────────────────────────────────

const LABELS = {
  en: {
    title: 'Earnings Report',
    period: 'Period',
    generated: 'Generated',
    groupBy: 'Group By',
    currency: 'Currency',
    grandTotal: 'Grand Total',
    avgRate: 'Avg Rate',
    totalHours: 'Total Hours',
    items: 'Items',
    hours: 'Hours',
    rate: 'Rate/hr',
    total: 'Total',
    date: 'Date',
    allTime: 'All Time',
    summarySheet: 'Summary',
    dailySheet: 'Daily Breakdown',
    perHour: '/hr',
    tag: 'Tag',
    project: 'Project',
  },
  de: {
    title: 'Einnahmenbericht',
    period: 'Zeitraum',
    generated: 'Erstellt',
    groupBy: 'Gruppierung',
    currency: 'Währung',
    grandTotal: 'Gesamtbetrag',
    avgRate: 'Ø Stundensatz',
    totalHours: 'Gesamtstunden',
    items: 'Einträge',
    hours: 'Stunden',
    rate: 'Satz/Std.',
    total: 'Gesamt',
    date: 'Datum',
    allTime: 'Gesamter Zeitraum',
    summarySheet: 'Zusammenfassung',
    dailySheet: 'Tagesübersicht',
    perHour: '/Std.',
    tag: 'Tag',
    project: 'Projekt',
  },
} as const

// ── Helpers ───────────────────────────────────────────

function getCurrencySymbol(currency: string): string {
  return (
    { USD: '$', EUR: '€', GBP: '£', JPY: '¥', CAD: 'C$', AUD: 'A$', CHF: 'CHF', INR: '₹', BRL: 'R$', SEK: 'kr' }[currency] ?? currency
  )
}

function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function currencyFmt(symbol: string): string {
  // Excel number format: e.g. "$#,##0.00" or "€#,##0.00"
  const safeSymbol = symbol.replace(/"/g, '')
  return `"${safeSymbol}"#,##0.00`
}

// ── Main Export ───────────────────────────────────────

export async function generateEarningsExcel(
  data: EarningsReport,
  groupBy: 'tag' | 'project',
  dateRange: { from?: string; to?: string },
  options: EarningsExcelOptions,
): Promise<void> {
  const { utils, write } = await import('xlsx')
  const { saveAs } = await import('file-saver')

  const L = LABELS[options.language]
  const sym = getCurrencySymbol(data.currency)
  const numFmt = currencyFmt(sym)
  const hrsFmt = '#,##0.0'

  const groupLabel = groupBy === 'tag' ? L.tag : L.project
  const periodDisplay =
    dateRange.from && dateRange.to
      ? `${formatDateDisplay(dateRange.from)} – ${formatDateDisplay(dateRange.to)}`
      : L.allTime

  const avgRate =
    data.items.length > 0
      ? data.items.reduce((s, p) => s + p.rate, 0) / data.items.length
      : 0

  const wb = utils.book_new()

  // ── Helper: apply bold style to header/total rows ──
  function boldCell(s?: object) {
    return { font: { bold: true }, ...(s ?? {}) }
  }

  function setCells(
    ws: ReturnType<typeof utils.aoa_to_sheet>,
    cells: Record<string, { t?: string; z?: string; s?: object }>,
  ) {
    for (const [addr, props] of Object.entries(cells)) {
      if (ws[addr]) Object.assign(ws[addr], props)
    }
  }

  // ── Sheet 1: Summary ──────────────────────────────
  if (options.includeSummary) {
    const now = new Date()
    const genDate = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

    const rows = [
      [L.title],
      [],
      [L.period, periodDisplay],
      [L.generated, genDate],
      [L.groupBy, groupLabel],
      [L.currency, data.currency],
      [],
      [L.grandTotal, data.grand_total],
      [L.avgRate, avgRate],
      [L.totalHours, data.total_hours],
      [L.items, data.total_items],
    ]

    const ws = utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 18 }, { wch: 24 }]

    // Number formats on the value cells
    setCells(ws, {
      B8: { t: 'n', z: numFmt },
      B9: { t: 'n', z: numFmt },
      B10: { t: 'n', z: hrsFmt },
    })

    // Bold title + labels
    if (ws['A1']) ws['A1'].s = boldCell()
    for (const addr of ['A3', 'A4', 'A5', 'A6', 'A8', 'A9', 'A10', 'A11']) {
      if (ws[addr]) ws[addr].s = boldCell()
    }

    utils.book_append_sheet(wb, ws, L.summarySheet)
  }

  // ── Sheet 2: Main Table ───────────────────────────
  if (options.includeMainTable) {
    const header = [groupLabel, L.hours, L.rate, L.total]
    const dataRows = data.items.map(p => [p.name, p.hours, p.rate, p.total])
    const totalRow = [L.grandTotal, data.total_hours, null, data.grand_total]
    const rows = [header, ...dataRows, [], totalRow]

    const ws = utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 22 }, { wch: 10 }, { wch: 14 }, { wch: 14 }]

    // Apply number formats to data rows
    const colB = 'B', colC = 'C', colD = 'D'
    for (let i = 0; i < data.items.length; i++) {
      const row = i + 2 // 1-indexed, header is row 1
      if (ws[`${colB}${row}`]) ws[`${colB}${row}`].z = hrsFmt
      if (ws[`${colC}${row}`]) ws[`${colC}${row}`].z = numFmt
      if (ws[`${colD}${row}`]) ws[`${colD}${row}`].z = numFmt
    }

    // Bold header row
    for (const col of ['A', 'B', 'C', 'D']) {
      if (ws[`${col}1`]) ws[`${col}1`].s = boldCell()
    }

    // Bold + number format grand total row
    const totalRowNum = data.items.length + 3 // header + rows + blank
    const totalCells: Record<string, object> = {
      [`A${totalRowNum}`]: { s: boldCell() },
      [`B${totalRowNum}`]: { s: boldCell(), z: hrsFmt },
      [`D${totalRowNum}`]: { s: boldCell(), z: numFmt },
    }
    for (const [addr, props] of Object.entries(totalCells)) {
      if (ws[addr]) Object.assign(ws[addr], props)
    }

    const sheetName = groupBy === 'tag'
      ? (options.language === 'de' ? 'Nach Tag' : 'By Tag')
      : (options.language === 'de' ? 'Nach Projekt' : 'By Project')
    utils.book_append_sheet(wb, ws, sheetName)
  }

  // ── Sheet 3: Daily Breakdown ──────────────────────
  if (options.includeDailyBreakdown && data.daily_earnings && data.daily_earnings.length > 0) {
    const header = [L.date, groupLabel, L.total]

    // Sort by date then item name
    const sorted = [...data.daily_earnings].sort((a, b) => {
      if (a.date < b.date) return -1
      if (a.date > b.date) return 1
      return a.item_name.localeCompare(b.item_name)
    })

    const dataRows = sorted.map(e => [e.date, e.item_name, e.total])

    // Subtotal per date
    const dateGroups: Record<string, number> = {}
    for (const e of sorted) {
      dateGroups[e.date] = (dateGroups[e.date] ?? 0) + e.total
    }

    const rows: (string | number | null)[][] = [header]
    let lastDate = ''
    for (const row of dataRows) {
      if (lastDate && row[0] !== lastDate) {
        // Insert a subtotal row for the previous date
        rows.push(['', `  ${options.language === 'de' ? 'Gesamt' : 'Subtotal'}`, dateGroups[lastDate]!])
        rows.push([])
      }
      rows.push(row)
      lastDate = row[0] as string
    }
    // Final subtotal
    if (lastDate) {
      rows.push(['', `  ${options.language === 'de' ? 'Gesamt' : 'Subtotal'}`, dateGroups[lastDate]!])
    }

    const ws = utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 14 }, { wch: 22 }, { wch: 14 }]

    // Bold header
    for (const col of ['A', 'B', 'C']) {
      if (ws[`${col}1`]) ws[`${col}1`].s = boldCell()
    }

    // Number format on total column (column C, rows 2+)
    const ref = utils.decode_range(ws['!ref'] ?? 'A1')
    for (let r = 1; r <= ref.e.r; r++) {
      const addr = `C${r + 1}`
      if (ws[addr] && typeof ws[addr].v === 'number') {
        ws[addr].z = numFmt
      }
    }

    utils.book_append_sheet(wb, ws, L.dailySheet)
  }

  // ── Save ──────────────────────────────────────────
  const buf = write(wb, { type: 'array', bookType: 'xlsx', cellStyles: true })
  const today = new Date()
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  saveAs(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `earnings-report-${dateStr}.xlsx`,
  )
}
