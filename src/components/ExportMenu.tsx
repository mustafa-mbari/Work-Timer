import { useState } from 'react'
import type { TimeEntry, Project } from '@/types'
import { exportCSV, exportExcel } from '@/utils/export'
import { DownloadIcon } from './Icons'
import { useToast } from './Toast'

interface ExportMenuProps {
  entries: TimeEntry[]
  projects: Project[]
  filename: string
}

export default function ExportMenu({ entries, projects, filename }: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const { showToast } = useToast()

  const handleExportCSV = () => {
    try {
      exportCSV(entries, projects, filename)
      showToast('CSV file exported successfully', 'success')
      setOpen(false)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Export failed', 'error')
    }
  }

  const handleExportExcel = () => {
    try {
      exportExcel(entries, projects, filename)
      showToast('Excel file exported successfully', 'success')
      setOpen(false)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Export failed', 'error')
    }
  }

  if (entries.length === 0) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 font-medium px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
        aria-label="Export data"
        aria-expanded={open}
      >
        <DownloadIcon className="w-3.5 h-3.5" />
        Export
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 bg-white dark:bg-dark-card border border-stone-200 dark:border-dark-border rounded-xl shadow-lg z-50 py-1.5 min-w-[130px] animate-fade-in">
            <button
              onClick={handleExportCSV}
              className="w-full text-left px-3.5 py-2 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-dark-hover transition-colors"
            >
              CSV (.csv)
            </button>
            <button
              onClick={handleExportExcel}
              className="w-full text-left px-3.5 py-2 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-dark-hover transition-colors"
            >
              Excel (.xlsx)
            </button>
          </div>
        </>
      )}
    </div>
  )
}
