import { saveAs } from 'file-saver'
import type { TimeEntry, Project } from '@/types'

function formatEntryRow(entry: TimeEntry, projects: Project[]) {
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
    Tags: entry.tags.join(', '),
  }
}

export function exportCSV(entries: TimeEntry[], projects: Project[], filename: string) {
  const rows = entries.map(e => formatEntryRow(e, projects))
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

export async function exportExcel(entries: TimeEntry[], projects: Project[], filename: string) {
  const rows = entries.map(e => formatEntryRow(e, projects))
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
