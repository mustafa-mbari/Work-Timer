import { saveAs } from 'file-saver'
import { format } from 'date-fns'
import type { TimeEntry, Project, Tag } from '@/types'
import { getWeekDays } from '@/utils/date'

// ── Helpers ──────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

function resolveTagNames(tagIds: string[], tags: Tag[]): string {
  if (tagIds.length === 0) return ''
  return tagIds
    .map(id => tags.find(t => t.id === id)?.name ?? id.slice(0, 8))
    .join(', ')
}

function formatEntryRow(entry: TimeEntry, projects: Project[], tags: Tag[] = []) {
  const project = projects.find(p => p.id === entry.projectId)
  const totalSeconds = Math.floor(entry.duration / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return {
    Date: entry.date,
    Start: new Date(entry.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    End: new Date(entry.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    Hours: hours,
    Minutes: minutes,
    Seconds: seconds,
    Project: project?.name ?? '',
    Description: entry.description,
    Type: entry.type,
    Tags: resolveTagNames(entry.tags, tags),
  }
}

function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ── CSV Export ────────────────────────────────────────────

export function exportCSV(entries: TimeEntry[], projects: Project[], filename: string, tags: Tag[] = []) {
  const rows = entries.map(e => formatEntryRow(e, projects, tags))
  if (rows.length === 0) {
    throw new Error('No entries to export for this period.')
  }

  try {
    const headers = Object.keys(rows[0])
    const csvLines = [
      headers.join(','),
      ...rows.map(row =>
        headers.map(h => {
          const val = String(row[h as keyof typeof row])
          return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val
        }).join(',')
      ),
    ]

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8' })
    saveAs(blob, `${filename}.csv`)
  } catch {
    throw new Error('Failed to export CSV file. Please try again.')
  }
}

// ── PDF Export ────────────────────────────────────────────

interface PDFOptions {
  userName?: string
  userEmail?: string
  weekStartDay?: 0 | 1
  workingDays?: number
}

const PAGE_W = 210
const PAGE_H = 297
const ML = 14
const MR = 14
const CW = PAGE_W - ML - MR
const INDIGO: [number, number, number] = [99, 102, 241]
const STONE_800: [number, number, number] = [41, 37, 36]
const STONE_500: [number, number, number] = [120, 113, 108]
const STONE_400: [number, number, number] = [168, 162, 158]
const STONE_200: [number, number, number] = [231, 229, 228]


export async function exportPDF(
  entries: TimeEntry[],
  projects: Project[],
  tags: Tag[],
  filename: string,
  dateRange: { start: string; end: string },
  options?: PDFOptions
) {
  if (entries.length === 0) {
    throw new Error('No entries to export for this period.')
  }

  try {
    const { default: jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as any
    let y = 14

    // ── Aggregated data ──
    const totalMs = entries.reduce((sum, e) => sum + e.duration, 0)
    const totalHours = totalMs / 3600000
    const uniqueDays = new Set(entries.map(e => e.date)).size
    const uniqueProjects = new Set(entries.map(e => e.projectId ?? '__none__')).size
    const dailyAvg = uniqueDays > 0 ? totalHours / uniqueDays : 0

    const byProject = new Map<string, { name: string; color: string; ms: number }>()
    for (const e of entries) {
      const project = projects.find(p => p.id === e.projectId)
      const key = e.projectId ?? '__none__'
      const existing = byProject.get(key)
      if (existing) {
        existing.ms += e.duration
      } else {
        byProject.set(key, {
          name: project?.name ?? 'No Project',
          color: project?.color ?? '#A8A29E',
          ms: e.duration,
        })
      }
    }

    const byTag = new Map<string, { name: string; color: string; ms: number }>()
    for (const e of entries) {
      if (e.tags.length === 0) continue
      const entryMs = e.duration / e.tags.length
      for (const tid of e.tags) {
        const tag = tags.find(t => t.id === tid)
        const existing = byTag.get(tid)
        if (existing) {
          existing.ms += entryMs
        } else {
          byTag.set(tid, {
            name: tag?.name ?? tid.slice(0, 8),
            color: tag?.color ?? '#6366F1',
            ms: entryMs,
          })
        }
      }
    }

    function checkPage(needed: number) {
      if (y + needed > PAGE_H - 20) {
        doc.addPage()
        y = 14
      }
    }

    // ── 1. Header ──
    doc.setFontSize(20)
    doc.setTextColor(...INDIGO)
    doc.text('Work Timer', ML, y + 6)

    doc.setFontSize(10)
    doc.setTextColor(...STONE_500)
    doc.text(`${dateRange.start}  \u2014  ${dateRange.end}`, ML, y + 13)

    // User info (right-aligned)
    if (options?.userName || options?.userEmail) {
      if (options.userName) {
        doc.setFontSize(10)
        doc.setTextColor(...STONE_800)
        doc.text(options.userName, PAGE_W - MR, y + 6, { align: 'right' })
      }
      if (options.userEmail) {
        doc.setFontSize(8)
        doc.setTextColor(...STONE_500)
        doc.text(options.userEmail, PAGE_W - MR, y + 12, { align: 'right' })
      }
    }

    y += 20

    // Horizontal rule
    doc.setDrawColor(...STONE_200)
    doc.setLineWidth(0.3)
    doc.line(ML, y, PAGE_W - MR, y)
    y += 6

    // ── 2. Summary Box ──
    const boxH = 18
    doc.setDrawColor(...STONE_200)
    doc.setLineWidth(0.3)
    doc.rect(ML, y, CW, boxH)

    const colW = CW / 4
    const metrics = [
      { label: 'Total Hours', value: `${totalHours.toFixed(1)}h` },
      { label: 'Entries', value: `${entries.length}` },
      { label: 'Projects', value: `${uniqueProjects}` },
      { label: 'Daily Average', value: `${dailyAvg.toFixed(1)}h` },
    ]

    for (let i = 0; i < metrics.length; i++) {
      const cx = ML + colW * i + colW / 2
      // Vertical separator
      if (i > 0) {
        doc.setDrawColor(...STONE_200)
        doc.line(ML + colW * i, y + 3, ML + colW * i, y + boxH - 3)
      }
      // Value
      doc.setFontSize(12)
      doc.setTextColor(...INDIGO)
      doc.text(metrics[i].value, cx, y + 8, { align: 'center' })
      // Label
      doc.setFontSize(7)
      doc.setTextColor(...STONE_400)
      doc.text(metrics[i].label, cx, y + 13, { align: 'center' })
    }

    y += boxH + 8

    // ── 3. Weekly Bar Chart ──
    const weekStartDay = options?.weekStartDay ?? 1
    const workingDays = options?.workingDays ?? 5
    const weekDates = getWeekDays(new Date(), weekStartDay, workingDays)
    const todayKey = toDateKey(new Date())
    const dateKeys = new Set(weekDates.map(toDateKey))

    // Aggregate per-day per-project hours (with midnight splitting)
    const chartProjects = new Map<string, { name: string; color: string }>()
    const dayData = new Map<string, Map<string, number>>()
    for (const d of weekDates) dayData.set(toDateKey(d), new Map())

    for (const entry of entries) {
      if (entry.duration <= 0) continue
      const pid = entry.projectId ?? '__none__'
      const project = projects.find(p => p.id === pid)
      const name = project?.name ?? 'No Project'
      const color = project?.color ?? '#A8A29E'
      if (!chartProjects.has(name)) chartProjects.set(name, { name, color })

      let cursor = entry.startTime
      const end = entry.endTime > entry.startTime ? entry.endTime : entry.startTime + entry.duration
      while (cursor < end) {
        const cursorDate = new Date(cursor)
        const dayKey = toDateKey(cursorDate)
        const nextMidnight = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), cursorDate.getDate() + 1).getTime()
        const sliceMs = Math.min(end, nextMidnight) - cursor
        if (dateKeys.has(dayKey)) {
          const dm = dayData.get(dayKey)!
          dm.set(name, (dm.get(name) ?? 0) + sliceMs / 3600000)
        }
        cursor = Math.min(end, nextMidnight)
      }
    }

    const projectList = Array.from(chartProjects.values())
    let maxDayH = 0.5
    for (const dm of dayData.values()) {
      let total = 0
      for (const h of dm.values()) total += h
      if (total > maxDayH) maxDayH = total
    }

    checkPage(65)

    // Chart title
    doc.setFontSize(10)
    doc.setTextColor(...STONE_800)
    doc.text('Weekly Overview', ML, y)
    y += 5

    const chartX = ML + 10 // room for y-axis labels
    const chartW = CW - 10
    const chartH = 42
    const chartBottom = y + chartH

    // Y-axis ticks
    const yTicks = 4
    const maxLabel = Math.ceil(maxDayH)
    for (let i = 0; i <= yTicks; i++) {
      const tickY = chartBottom - (i / yTicks) * chartH
      const tickVal = ((i / yTicks) * maxLabel).toFixed(i === 0 ? 0 : 1)
      doc.setFontSize(6)
      doc.setTextColor(...STONE_400)
      doc.text(`${tickVal}h`, ML, tickY + 1)
      // Grid line
      doc.setDrawColor(...STONE_200)
      doc.setLineWidth(0.1)
      doc.line(chartX, tickY, chartX + chartW, tickY)
    }

    // Bars
    const dayCount = weekDates.length
    const barGroupW = chartW / dayCount
    const barW = Math.min(barGroupW * 0.55, 18)

    for (let di = 0; di < weekDates.length; di++) {
      const dateKey = toDateKey(weekDates[di])
      const dm = dayData.get(dateKey) ?? new Map()
      const barCx = chartX + barGroupW * di + barGroupW / 2
      const barLeft = barCx - barW / 2
      const isToday = dateKey === todayKey

      // Stack segments bottom-up
      let stackY = chartBottom
      let dayTotal = 0
      for (const p of projectList) {
        const hrs = dm.get(p.name) ?? 0
        if (hrs <= 0) continue
        dayTotal += hrs
        const segH = (hrs / maxLabel) * chartH
        stackY -= segH
        const [r, g, b] = hexToRgb(p.color)
        doc.setFillColor(r, g, b)
        doc.rect(barLeft, stackY, barW, segH, 'F')
      }

      // Hours label above bar
      if (dayTotal > 0) {
        doc.setFontSize(6)
        doc.setTextColor(...(isToday ? INDIGO : STONE_500))
        const label = dayTotal >= 1 ? `${dayTotal.toFixed(1)}h` : `${Math.round(dayTotal * 60)}m`
        doc.text(label, barCx, stackY - 1.5, { align: 'center' })
      }

      // Day label below
      doc.setFontSize(7)
      doc.setTextColor(...(isToday ? INDIGO : STONE_400))
      doc.text(format(weekDates[di], 'EEE'), barCx, chartBottom + 4, { align: 'center' })

      // Today highlight
      if (isToday) {
        doc.setDrawColor(...INDIGO)
        doc.setLineWidth(0.3)
        doc.rect(barLeft - 1, y - 1, barW + 2, chartH + 2)
      }
    }

    y = chartBottom + 8

    // Chart legend
    if (projectList.length > 0) {
      let lx = ML
      doc.setFontSize(7)
      for (const p of projectList) {
        const [r, g, b] = hexToRgb(p.color)
        doc.setFillColor(r, g, b)
        doc.circle(lx + 1.5, y - 0.5, 1.2, 'F')
        doc.setTextColor(...STONE_500)
        const textW = doc.getTextWidth(p.name)
        doc.text(p.name, lx + 4, y)
        lx += textW + 8
        if (lx > PAGE_W - MR - 20) { lx = ML; y += 4 }
      }
      y += 6
    }

    // ── 4. Project Breakdown ──
    checkPage(10 + byProject.size * 5)
    doc.setFontSize(10)
    doc.setTextColor(...STONE_800)
    doc.text('Projects', ML, y)
    y += 5

    const projectArr = Array.from(byProject.values()).sort((a, b) => b.ms - a.ms)
    let col = 0
    for (const p of projectArr) {
      const x = col === 0 ? ML : ML + CW / 2
      const [r, g, b] = hexToRgb(p.color)
      doc.setFillColor(r, g, b)
      doc.circle(x + 2, y - 1, 1.5, 'F')
      doc.setFontSize(8)
      doc.setTextColor(...STONE_500)
      const pct = totalMs > 0 ? ((p.ms / totalMs) * 100).toFixed(0) : '0'
      doc.text(`${p.name}: ${(p.ms / 3600000).toFixed(1)}h (${pct}%)`, x + 5.5, y)
      if (col === 1) { y += 5; col = 0 } else { col = 1 }
    }
    if (col === 1) y += 5
    y += 4

    // ── 5. Tag Breakdown ──
    if (byTag.size > 0) {
      checkPage(10 + byTag.size * 5)
      doc.setFontSize(10)
      doc.setTextColor(...STONE_800)
      doc.text('Tags', ML, y)
      y += 5

      const tagArr = Array.from(byTag.values()).sort((a, b) => b.ms - a.ms)
      col = 0
      for (const t of tagArr) {
        const x = col === 0 ? ML : ML + CW / 2
        const [r, g, b] = hexToRgb(t.color)
        doc.setFillColor(r, g, b)
        doc.circle(x + 2, y - 1, 1.5, 'F')
        doc.setFontSize(8)
        doc.setTextColor(...STONE_500)
        const pct = totalMs > 0 ? ((t.ms / totalMs) * 100).toFixed(0) : '0'
        doc.text(`${t.name}: ${(t.ms / 3600000).toFixed(1)}h (${pct}%)`, x + 5.5, y)
        if (col === 1) { y += 5; col = 0 } else { col = 1 }
      }
      if (col === 1) y += 5
      y += 4
    }

    // ── 6. Daily Summary Table ──
    checkPage(30)
    doc.setFontSize(10)
    doc.setTextColor(...STONE_800)
    doc.text('Daily Summary', ML, y)
    y += 3

    const dayGroups = new Map<string, { ms: number; count: number; projects: Set<string> }>()
    for (const e of entries) {
      const g = dayGroups.get(e.date)
      if (g) {
        g.ms += e.duration
        g.count++
        if (e.projectId) {
          const pname = projects.find(p => p.id === e.projectId)?.name
          if (pname) g.projects.add(pname)
        }
      } else {
        const pname = e.projectId ? projects.find(p => p.id === e.projectId)?.name : undefined
        const ps = new Set<string>()
        if (pname) ps.add(pname)
        dayGroups.set(e.date, { ms: e.duration, count: 1, projects: ps })
      }
    }

    const sortedDays = Array.from(dayGroups.entries()).sort((a, b) => a[0].localeCompare(b[0]))

    const dailyBody = sortedDays.map(([date, g]) => {
      const d = new Date(date + 'T00:00:00')
      return [
        format(d, 'EEE'),
        date,
        `${(g.ms / 3600000).toFixed(1)}h`,
        `${g.count}`,
        Array.from(g.projects).join(', ') || 'No Project',
      ]
    })
    // Totals row
    dailyBody.push([
      '', 'Total',
      `${totalHours.toFixed(1)}h`,
      `${entries.length}`,
      '',
    ])

    autoTable(doc, {
      startY: y,
      head: [['Day', 'Date', 'Hours', 'Entries', 'Projects']],
      body: dailyBody,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: {
        fillColor: [99, 102, 241] as [number, number, number],
        textColor: 255,
        fontSize: 7,
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [250, 250, 249] as [number, number, number] },
      margin: { left: ML, right: MR },
      columnStyles: {
        0: { cellWidth: 14 },
        1: { cellWidth: 24 },
        2: { cellWidth: 18 },
        3: { cellWidth: 16 },
        4: { cellWidth: 'auto' },
      },
      didParseCell(data: { row: { index: number }; cell: { styles: { fontStyle: string } } }) {
        if (data.row.index === dailyBody.length - 1) {
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })

    y = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 40
    y += 8

    // ── 7. Entries Table ──
    checkPage(30)
    doc.setFontSize(10)
    doc.setTextColor(...STONE_800)
    doc.text('Time Entries', ML, y)
    y += 3

    const entryRows = entries
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime - b.startTime)
      .map(e => {
        const row = formatEntryRow(e, projects, tags)
        return [
          row.Date,
          row.Start,
          row.End,
          `${row.Hours}h ${row.Minutes}m`,
          row.Project,
          row.Tags,
          row.Description,
        ]
      })

    autoTable(doc, {
      startY: y,
      head: [['Date', 'Start', 'End', 'Duration', 'Project', 'Tags', 'Description']],
      body: entryRows,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: {
        fillColor: [99, 102, 241] as [number, number, number],
        textColor: 255,
        fontSize: 7,
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [250, 250, 249] as [number, number, number] },
      margin: { left: ML, right: MR },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 14 },
        2: { cellWidth: 14 },
        3: { cellWidth: 18 },
        4: { cellWidth: 24 },
        5: { cellWidth: 24 },
        6: { cellWidth: 'auto' },
      },
    })

    // ── 8. Footer (page numbers, timestamp, branding) ──
    const pageCount = doc.getNumberOfPages()
    const generatedAt = new Date().toLocaleString()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      // Separator line
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
      doc.text(`Generated: ${generatedAt}`, PAGE_W / 2, PAGE_H - 8, { align: 'center' })
      // Right: page number
      doc.setFontSize(7)
      doc.setTextColor(...STONE_400)
      doc.text(`Page ${i} of ${pageCount}`, PAGE_W - MR, PAGE_H - 8, { align: 'right' })
    }

    doc.save(`${filename}.pdf`)
  } catch {
    throw new Error('Failed to export PDF file. Please try again.')
  }
}

// ── Excel Export ──────────────────────────────────────────

export async function exportExcel(entries: TimeEntry[], projects: Project[], filename: string, tags: Tag[] = []) {
  const rows = entries.map(e => formatEntryRow(e, projects, tags))
  if (rows.length === 0) {
    throw new Error('No entries to export for this period.')
  }

  try {
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Time Entries')

    // Auto-size columns
    const colWidths = Object.keys(rows[0]).map(key => ({
      wch: Math.max(key.length, ...rows.map(r => String(r[key as keyof typeof r]).length)) + 2,
    }))
    ws['!cols'] = colWidths

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, `${filename}.xlsx`)
  } catch {
    throw new Error('Failed to export Excel file. Please try again.')
  }
}
