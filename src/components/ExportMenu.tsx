import { useState } from 'react'
import type { TimeEntry, Project } from '@/types'
import { exportCSV, exportExcel } from '@/utils/export'

interface ExportMenuProps {
  entries: TimeEntry[]
  projects: Project[]
  filename: string
}

export default function ExportMenu({ entries, projects, filename }: ExportMenuProps) {
  const [open, setOpen] = useState(false)

  if (entries.length === 0) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded-md hover:bg-blue-50"
        aria-label="Export data"
        aria-expanded={open}
      >
        Export
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[120px]">
            <button
              onClick={() => { exportCSV(entries, projects, filename); setOpen(false) }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              CSV (.csv)
            </button>
            <button
              onClick={() => { exportExcel(entries, projects, filename); setOpen(false) }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              Excel (.xlsx)
            </button>
          </div>
        </>
      )}
    </div>
  )
}
