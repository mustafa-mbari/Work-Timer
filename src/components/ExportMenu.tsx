import { useState } from 'react'
import type { TimeEntry, Project } from '@/types'
import { exportCSV, exportExcel } from '@/utils/export'
import { DownloadIcon } from './Icons'
import { useToast } from './Toast'
import { usePremium } from '@/hooks/usePremium'
import UpgradePrompt from './UpgradePrompt'

interface ExportMenuProps {
  entries: TimeEntry[]
  projects: Project[]
  filename: string
}

export default function ExportMenu({ entries, projects, filename }: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const { showToast } = useToast()
  const { isPremium } = usePremium()

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
    <>
      <UpgradePrompt
        isOpen={showUpgrade}
        feature="CSV & Excel export"
        onClose={() => setShowUpgrade(false)}
      />

      <div className="relative">
        <button
          onClick={() => isPremium ? setOpen(!open) : setShowUpgrade(true)}
          className="flex items-center gap-1 text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 font-medium px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
          aria-label="Export data"
          aria-expanded={open}
        >
          {!isPremium && (
            <svg className="w-3 h-3 text-stone-400 dark:text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )}
          <DownloadIcon className="w-3.5 h-3.5" />
          Export
        </button>

        {open && isPremium && (
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
    </>
  )
}
