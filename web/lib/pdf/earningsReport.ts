import { saveAs } from 'file-saver'
import type { EarningsReport } from '@/lib/repositories/earnings'

// ── Types ──────────────────────────────────────────────

export interface EarningsPdfOptions {
  // Content toggles
  includeSummary: boolean
  includeTable: boolean
  includeDailyChart: boolean
  includeDailyBreakdown: boolean
  includeTagBreakdown: boolean
  onlyWorkDays: boolean

  // Formatting
  pageSize: 'a4' | 'letter'
  orientation: 'portrait' | 'landscape'
  language: 'en' | 'de'
  showColors: boolean

  // Additional info
  companyName?: string
  city?: string
  address?: string
  notes?: string
  reportNumber?: string
}

// ── Constants ──────────────────────────────────────────

const INDIGO: [number, number, number] = [99, 102, 241]
const EMERALD: [number, number, number] = [16, 185, 129]
const STONE_800: [number, number, number] = [41, 37, 36]
const STONE_500: [number, number, number] = [120, 113, 108]
const STONE_400: [number, number, number] = [168, 162, 158]
const STONE_200: [number, number, number] = [231, 229, 228]

const PAGE_SIZES = {
  a4: { w: 210, h: 297 },
  letter: { w: 215.9, h: 279.4 },
} as const

const LABELS = {
  en: {
    title: 'Earnings Report',
    summary: 'Summary',
    grandTotal: 'Grand Total',
    avgRate: 'Avg Rate',
    totalHours: 'Total Hours',
    items: 'Items',
    earningsBy: (g: string) => `Earnings by ${g === 'tag' ? 'Tag' : 'Project'}`,
    tagBreakdown: 'Earnings by Tag',
    tag: 'Tag',
    project: 'Project',
    hours: 'Hours',
    rate: 'Rate',
    total: 'Total',
    dailyChart: 'Daily Earnings',
    dailyBreakdown: 'Daily Breakdown',
    date: 'Date',
    notes: 'Notes',
    period: 'Period',
    reportDate: 'Report Date',
    reportNo: 'Report No.',
    currency: 'Currency',
    allTime: 'All Time',
    generated: 'Generated',
    page: 'Page',
    of: 'of',
    perHour: '/hr',
  },
  de: {
    title: 'Einnahmenbericht',
    summary: 'Zusammenfassung',
    grandTotal: 'Gesamtbetrag',
    avgRate: '\u00D8 Stundensatz',
    totalHours: 'Gesamtstunden',
    items: 'Positionen',
    earningsBy: (g: string) => `Einnahmen nach ${g === 'tag' ? 'Tag' : 'Projekt'}`,
    tagBreakdown: 'Einnahmen nach Tag',
    tag: 'Tag',
    project: 'Projekt',
    hours: 'Stunden',
    rate: 'Satz',
    total: 'Gesamt',
    dailyChart: 'T\u00E4gliche Einnahmen',
    dailyBreakdown: 'T\u00E4gliche Aufschl\u00FCsselung',
    date: 'Datum',
    notes: 'Notizen',
    period: 'Zeitraum',
    reportDate: 'Berichtsdatum',
    reportNo: 'Bericht Nr.',
    currency: 'W\u00E4hrung',
    allTime: 'Gesamter Zeitraum',
    generated: 'Erstellt',
    page: 'Seite',
    of: 'von',
    perHour: '/Std.',
  },
} as const

// ── Helpers ────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

function getCurrencySymbol(code: string): string {
  const map: Record<string, string> = {
    USD: '$', EUR: '\u20AC', GBP: '\u00A3', JPY: '\u00A5',
    CAD: 'C$', AUD: 'A$', CHF: 'CHF', INR: '\u20B9', BRL: 'R$', SEK: 'kr',
  }
  return map[code] ?? code
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatMoney(amount: number, symbol: string): string {
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  return day === 0 || day === 6 // Sunday or Saturday
}

// ── Main Export Function ───────────────────────────────

export async function generateEarningsPdf(
  data: EarningsReport,
  groupBy: 'tag' | 'project',
  dateRange: { from?: string; to?: string },
  options: EarningsPdfOptions,
  tagData?: EarningsReport | null,
): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const L = LABELS[options.language]
  const cs = getCurrencySymbol(data.currency)
  const isLandscape = options.orientation === 'landscape'
  const pageFormat = PAGE_SIZES[options.pageSize]
  const PAGE_W = isLandscape ? pageFormat.h : pageFormat.w
  const PAGE_H = isLandscape ? pageFormat.w : pageFormat.h
  const ML = 14
  const MR = 14
  const CW = PAGE_W - ML - MR

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = new jsPDF({
    orientation: options.orientation,
    unit: 'mm',
    format: options.pageSize,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any
  let y = 14

  function checkPage(needed: number) {
    if (y + needed > PAGE_H - 20) {
      doc.addPage()
      y = 14
    }
  }

  // ── A. Header (always) ──────────────────────────────

  // Title
  doc.setFontSize(22)
  doc.setTextColor(...INDIGO)
  doc.text(L.title, ML, y + 7)

  // Company name / city / address (left, below title)
  let leftY = y + 14
  if (options.companyName) {
    doc.setFontSize(10)
    doc.setTextColor(...STONE_800)
    doc.text(options.companyName, ML, leftY)
    leftY += 5
  }
  if (options.city) {
    doc.setFontSize(8)
    doc.setTextColor(...STONE_500)
    doc.text(options.city, ML, leftY)
    leftY += 4
  }
  if (options.address) {
    doc.setFontSize(8)
    doc.setTextColor(...STONE_500)
    const addressLines = doc.splitTextToSize(options.address, CW / 2 - 10)
    doc.text(addressLines, ML, leftY)
    leftY += addressLines.length * 3.5
  }

  // Right side: period, report date, report number, currency
  let rightY = y + 7
  doc.setFontSize(8)
  doc.setTextColor(...STONE_500)

  const periodStr = dateRange.from && dateRange.to
    ? `${formatDateDisplay(dateRange.from)} \u2014 ${formatDateDisplay(dateRange.to)}`
    : L.allTime
  doc.text(`${L.period}: ${periodStr}`, PAGE_W - MR, rightY, { align: 'right' })
  rightY += 4

  doc.text(`${L.reportDate}: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`, PAGE_W - MR, rightY, { align: 'right' })
  rightY += 4

  if (options.reportNumber) {
    doc.text(`${L.reportNo} ${options.reportNumber}`, PAGE_W - MR, rightY, { align: 'right' })
    rightY += 4
  }

  doc.text(`${L.currency}: ${data.currency}`, PAGE_W - MR, rightY, { align: 'right' })

  y = Math.max(leftY, rightY) + 4

  // Horizontal rule
  doc.setDrawColor(...STONE_200)
  doc.setLineWidth(0.3)
  doc.line(ML, y, PAGE_W - MR, y)
  y += 8

  // ── B. Summary Box ──────────────────────────────────

  if (options.includeSummary) {
    checkPage(26)

    doc.setFontSize(10)
    doc.setTextColor(...STONE_800)
    doc.text(L.summary, ML, y)
    y += 5

    const boxH = 20
    doc.setDrawColor(...STONE_200)
    doc.setLineWidth(0.3)
    doc.rect(ML, y, CW, boxH)

    const avgRate = data.items.length > 0
      ? data.items.reduce((s, item) => s + item.rate, 0) / data.items.length
      : 0

    const colW = CW / 4
    const metrics = [
      { label: L.grandTotal, value: formatMoney(data.grand_total, cs) },
      { label: L.avgRate, value: `${cs}${avgRate.toFixed(2)}${L.perHour}` },
      { label: L.totalHours, value: `${data.total_hours.toFixed(1)}h` },
      { label: L.items, value: `${data.total_items}` },
    ]

    for (let i = 0; i < metrics.length; i++) {
      const cx = ML + colW * i + colW / 2
      if (i > 0) {
        doc.setDrawColor(...STONE_200)
        doc.line(ML + colW * i, y + 3, ML + colW * i, y + boxH - 3)
      }
      doc.setFontSize(12)
      doc.setTextColor(...INDIGO)
      doc.text(metrics[i].value, cx, y + 9, { align: 'center' })
      doc.setFontSize(7)
      doc.setTextColor(...STONE_400)
      doc.text(metrics[i].label, cx, y + 14, { align: 'center' })
    }

    y += boxH + 10
  }

  // ── C. Earnings Table ───────────────────────────────

  if (options.includeTable && data.items.length > 0) {
    checkPage(30)

    doc.setFontSize(10)
    doc.setTextColor(...STONE_800)
    doc.text(L.earningsBy(groupBy), ML, y)
    y += 3

    const itemLabel = groupBy === 'tag' ? L.tag : L.project

    const tableBody = data.items.map(item => {
      const row: string[] = []
      if (options.showColors) row.push('') // color dot placeholder
      row.push(item.name)
      row.push(`${item.hours.toFixed(1)}`)
      row.push(`${cs}${item.rate.toFixed(2)}${L.perHour}`)
      row.push(formatMoney(item.total, cs))
      return row
    })

    // Grand total row
    const totalRow: string[] = []
    if (options.showColors) totalRow.push('')
    totalRow.push(L.grandTotal)
    totalRow.push(`${data.total_hours.toFixed(1)}`)
    totalRow.push('')
    totalRow.push(formatMoney(data.grand_total, cs))
    tableBody.push(totalRow)

    const head: string[] = []
    if (options.showColors) head.push('')
    head.push(itemLabel, L.hours, L.rate, L.total)

    const colorColWidth = options.showColors ? 8 : 0

    autoTable(doc, {
      startY: y,
      head: [head],
      body: tableBody,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: INDIGO as [number, number, number],
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [250, 250, 249] as [number, number, number] },
      margin: { left: ML, right: MR },
      columnStyles: options.showColors
        ? {
            0: { cellWidth: colorColWidth, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 22, halign: 'right' },
            3: { cellWidth: 30, halign: 'right' },
            4: { cellWidth: 32, halign: 'right' },
          }
        : {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 22, halign: 'right' },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 32, halign: 'right' },
          },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      didParseCell(cellData: any) {
        // Bold the grand total row
        if (cellData.row.index === tableBody.length - 1) {
          cellData.cell.styles.fontStyle = 'bold'
        }
        // Emerald for grand total amount
        const totalColIdx = options.showColors ? 4 : 3
        if (cellData.row.index === tableBody.length - 1 && cellData.column.index === totalColIdx) {
          cellData.cell.styles.textColor = [...EMERALD] as unknown as number[]
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      didDrawCell(cellData: any) {
        // Draw color dots in the first column
        if (options.showColors && cellData.column.index === 0 && cellData.row.section === 'body') {
          const rowIdx = cellData.row.index
          if (rowIdx < data.items.length) {
            const item = data.items[rowIdx]
            const [r, g, b] = hexToRgb(item.color)
            doc.setFillColor(r, g, b)
            doc.circle(
              cellData.cell.x + cellData.cell.width / 2,
              cellData.cell.y + cellData.cell.height / 2,
              1.5,
              'F',
            )
          }
        }
      },
    })

    y = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 40
    y += 10
  }

  // ── D. Daily Chart ──────────────────────────────────

  // Filter daily_earnings by work days if option is set
  const filteredDailyEarnings = data.daily_earnings
    ? (options.onlyWorkDays ? data.daily_earnings.filter(de => !isWeekend(de.date)) : data.daily_earnings)
    : null

  if (options.includeDailyChart && filteredDailyEarnings && filteredDailyEarnings.length > 0) {
    checkPage(75)

    doc.setFontSize(10)
    doc.setTextColor(...STONE_800)
    doc.text(L.dailyChart, ML, y)
    y += 6

    // Pivot daily_earnings to per-day per-item structure
    const dailyMap = new Map<string, Map<string, number>>()
    const itemColors = new Map<string, string>()
    const itemNames = new Map<string, string>()

    for (const de of filteredDailyEarnings) {
      if (!dailyMap.has(de.date)) dailyMap.set(de.date, new Map())
      const dayMap = dailyMap.get(de.date)!
      dayMap.set(de.item_id, (dayMap.get(de.item_id) ?? 0) + de.total)
      if (!itemColors.has(de.item_id)) {
        itemColors.set(de.item_id, de.item_color)
        itemNames.set(de.item_id, de.item_name)
      }
    }

    const sortedDates = Array.from(dailyMap.keys()).sort()
    const itemIds = Array.from(itemColors.keys())

    // Calculate max daily total for Y scale
    let maxDayTotal = 0
    for (const dayMap of dailyMap.values()) {
      let dayTotal = 0
      for (const v of dayMap.values()) dayTotal += v
      if (dayTotal > maxDayTotal) maxDayTotal = dayTotal
    }
    if (maxDayTotal === 0) maxDayTotal = 1

    const chartX = ML + 16
    const chartW = CW - 16
    const chartH = 45
    const chartBottom = y + chartH

    // Y-axis ticks
    const yTicks = 4
    const maxLabel = Math.ceil(maxDayTotal / 10) * 10 || maxDayTotal
    for (let i = 0; i <= yTicks; i++) {
      const tickY = chartBottom - (i / yTicks) * chartH
      const tickVal = formatMoney((i / yTicks) * maxLabel, cs)
      doc.setFontSize(6)
      doc.setTextColor(...STONE_400)
      doc.text(tickVal, ML, tickY + 1)
      doc.setDrawColor(...STONE_200)
      doc.setLineWidth(0.1)
      doc.line(chartX, tickY, chartX + chartW, tickY)
    }

    // Bars
    const dayCount = sortedDates.length
    const barGroupW = chartW / Math.max(dayCount, 1)
    const barW = Math.min(barGroupW * 0.65, 14)

    for (let di = 0; di < sortedDates.length; di++) {
      const dateKey = sortedDates[di]
      const dayMap = dailyMap.get(dateKey) ?? new Map()
      const barCx = chartX + barGroupW * di + barGroupW / 2
      const barLeft = barCx - barW / 2

      // Stack segments bottom-up
      let stackY = chartBottom
      let dayTotal = 0
      for (const itemId of itemIds) {
        const val = dayMap.get(itemId) ?? 0
        if (val <= 0) continue
        dayTotal += val
        const segH = (val / maxLabel) * chartH
        stackY -= segH
        const color = itemColors.get(itemId) ?? '#6366F1'
        const [r, g, b] = hexToRgb(color)
        doc.setFillColor(r, g, b)
        doc.rect(barLeft, stackY, barW, segH, 'F')
      }

      // Amount label above bar
      if (dayTotal > 0) {
        doc.setFontSize(5)
        doc.setTextColor(...STONE_500)
        doc.text(formatMoney(dayTotal, cs), barCx, stackY - 1.5, { align: 'center' })
      }

      // Date label below (show selectively if many days)
      const showLabel = dayCount <= 14 || di % Math.ceil(dayCount / 14) === 0
      if (showLabel) {
        doc.setFontSize(5)
        doc.setTextColor(...STONE_400)
        const d = new Date(dateKey + 'T00:00:00')
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        doc.text(label, barCx, chartBottom + 3.5, { align: 'center' })
      }
    }

    y = chartBottom + 7

    // Legend
    if (itemIds.length > 0) {
      let lx = ML
      doc.setFontSize(7)
      for (const itemId of itemIds) {
        const name = itemNames.get(itemId) ?? itemId
        const color = itemColors.get(itemId) ?? '#6366F1'
        const [r, g, b] = hexToRgb(color)
        doc.setFillColor(r, g, b)
        doc.circle(lx + 1.5, y - 0.5, 1.2, 'F')
        doc.setTextColor(...STONE_500)
        const textW = doc.getTextWidth(name)
        doc.text(name, lx + 4, y)
        lx += textW + 8
        if (lx > PAGE_W - MR - 20) { lx = ML; y += 4 }
      }
      y += 8
    }
  }

  // ── E. Daily Breakdown ──────────────────────────────

  if (options.includeDailyBreakdown && filteredDailyEarnings && filteredDailyEarnings.length > 0) {
    checkPage(30)

    doc.setFontSize(10)
    doc.setTextColor(...STONE_800)
    doc.text(L.dailyBreakdown, ML, y)
    y += 3

    // Group daily_earnings by date
    const byDate = new Map<string, Array<{ name: string; color: string; total: number; hours: number; rate: number }>>()
    const itemRateMap = new Map<string, number>()
    for (const item of data.items) {
      itemRateMap.set(item.id, item.rate)
    }

    for (const de of filteredDailyEarnings) {
      if (!byDate.has(de.date)) byDate.set(de.date, [])
      const rate = itemRateMap.get(de.item_id) ?? 0
      const hours = rate > 0 ? de.total / rate : 0
      byDate.get(de.date)!.push({
        name: de.item_name,
        color: de.item_color,
        total: de.total,
        hours,
        rate,
      })
    }

    const sortedDates = Array.from(byDate.keys()).sort()

    // Build rows: date header + items + day total
    const breakdownBody: string[][] = []
    const dayTotalRows = new Set<number>()
    const dateHeaderRows = new Set<number>()

    for (const dateKey of sortedDates) {
      const items = byDate.get(dateKey)!
      const dayTotal = items.reduce((s, i) => s + i.total, 0)

      dateHeaderRows.add(breakdownBody.length)
      breakdownBody.push([formatDateDisplay(dateKey), '', '', '', ''])

      for (const item of items) {
        breakdownBody.push([
          '',
          item.name,
          item.hours > 0 ? `${item.hours.toFixed(1)}h` : '-',
          item.rate > 0 ? `${cs}${item.rate.toFixed(2)}${L.perHour}` : '-',
          formatMoney(item.total, cs),
        ])
      }

      dayTotalRows.add(breakdownBody.length)
      breakdownBody.push(['', '', '', L.total, formatMoney(dayTotal, cs)])
    }

    autoTable(doc, {
      startY: y,
      head: [[L.date, groupBy === 'tag' ? L.tag : L.project, L.hours, L.rate, L.total]],
      body: breakdownBody,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: {
        fillColor: INDIGO as [number, number, number],
        textColor: 255,
        fontSize: 7,
        fontStyle: 'bold',
      },
      alternateRowStyles: {},
      margin: { left: ML, right: MR },
      columnStyles: {
        0: { cellWidth: 36 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 20, halign: 'right' },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      didParseCell(cellData: any) {
        if (dateHeaderRows.has(cellData.row.index)) {
          cellData.cell.styles.fontStyle = 'bold'
          cellData.cell.styles.fillColor = [245, 245, 244] // stone-100
        }
        if (dayTotalRows.has(cellData.row.index)) {
          cellData.cell.styles.fontStyle = 'bold'
        }
      },
    })

    y = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 40
    y += 10
  }

  // ── E2. Tag Breakdown (when groupBy='project') ─────

  if (options.includeTagBreakdown && tagData && tagData.items.length > 0) {
    checkPage(30)

    doc.setFontSize(10)
    doc.setTextColor(...STONE_800)
    doc.text(L.tagBreakdown, ML, y)
    y += 3

    const tagCs = getCurrencySymbol(tagData.currency)

    const tagBody = tagData.items.map(item => {
      const row: string[] = []
      if (options.showColors) row.push('')
      row.push(item.name)
      row.push(`${item.hours.toFixed(1)}`)
      row.push(`${tagCs}${item.rate.toFixed(2)}${L.perHour}`)
      row.push(formatMoney(item.total, tagCs))
      return row
    })

    const tagTotalRow: string[] = []
    if (options.showColors) tagTotalRow.push('')
    tagTotalRow.push(L.grandTotal)
    tagTotalRow.push(`${tagData.total_hours.toFixed(1)}`)
    tagTotalRow.push('')
    tagTotalRow.push(formatMoney(tagData.grand_total, tagCs))
    tagBody.push(tagTotalRow)

    const tagHead: string[] = []
    if (options.showColors) tagHead.push('')
    tagHead.push(L.tag, L.hours, L.rate, L.total)

    const colorColWidth = options.showColors ? 8 : 0

    autoTable(doc, {
      startY: y,
      head: [tagHead],
      body: tagBody,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: INDIGO as [number, number, number],
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [250, 250, 249] as [number, number, number] },
      margin: { left: ML, right: MR },
      columnStyles: options.showColors
        ? {
            0: { cellWidth: colorColWidth, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 22, halign: 'right' },
            3: { cellWidth: 30, halign: 'right' },
            4: { cellWidth: 32, halign: 'right' },
          }
        : {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 22, halign: 'right' },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 32, halign: 'right' },
          },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      didParseCell(cellData: any) {
        if (cellData.row.index === tagBody.length - 1) {
          cellData.cell.styles.fontStyle = 'bold'
        }
        const totalColIdx = options.showColors ? 4 : 3
        if (cellData.row.index === tagBody.length - 1 && cellData.column.index === totalColIdx) {
          cellData.cell.styles.textColor = [...EMERALD] as unknown as number[]
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      didDrawCell(cellData: any) {
        if (options.showColors && cellData.column.index === 0 && cellData.row.section === 'body') {
          const rowIdx = cellData.row.index
          if (rowIdx < tagData.items.length) {
            const item = tagData.items[rowIdx]
            const [r, g, b] = hexToRgb(item.color)
            doc.setFillColor(r, g, b)
            doc.circle(
              cellData.cell.x + cellData.cell.width / 2,
              cellData.cell.y + cellData.cell.height / 2,
              1.5,
              'F',
            )
          }
        }
      },
    })

    y = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 40
    y += 10
  }

  // ── F. Notes Section ────────────────────────────────

  if (options.notes) {
    checkPage(20)

    doc.setFontSize(10)
    doc.setTextColor(...STONE_800)
    doc.text(L.notes, ML, y)
    y += 5

    doc.setFontSize(8)
    doc.setTextColor(...STONE_500)
    const noteLines = doc.splitTextToSize(options.notes, CW)
    doc.text(noteLines, ML, y)
    y += noteLines.length * 3.5 + 6
  }

  // ── G. Footer (all pages) ──────────────────────────

  const pageCount = doc.getNumberOfPages()
  const generatedAt = new Date().toLocaleString()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setDrawColor(...STONE_200)
    doc.setLineWidth(0.2)
    doc.line(ML, PAGE_H - 14, PAGE_W - MR, PAGE_H - 14)
    // Left: branding
    doc.setFontSize(7)
    doc.setTextColor(...INDIGO)
    doc.text('w-timer.com', ML, PAGE_H - 10)
    doc.setTextColor(...STONE_400)
    doc.text('info@w-timer.com', ML, PAGE_H - 6.5)
    // Center: generated timestamp
    doc.setFontSize(6)
    doc.setTextColor(...STONE_400)
    doc.text(`${L.generated}: ${generatedAt}`, PAGE_W / 2, PAGE_H - 8, { align: 'center' })
    // Right: page number
    doc.setFontSize(7)
    doc.setTextColor(...STONE_400)
    doc.text(`${L.page} ${i} ${L.of} ${pageCount}`, PAGE_W - MR, PAGE_H - 8, { align: 'right' })
  }

  // ── Save ────────────────────────────────────────────

  const filename = `earnings-report-${new Date().toISOString().split('T')[0]}`
  doc.save(`${filename}.pdf`)
}
