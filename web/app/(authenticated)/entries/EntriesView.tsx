'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import EntryFilters from './EntryFilters'
import EntriesTable, {
  type ColumnId,
  ALL_COLUMNS,
  COLUMNS_STORAGE_KEY,
  loadColumnPrefs,
} from './EntriesTable'
import EntryFormDialog from './EntryFormDialog'
import TimerWidget from './TimerWidget'
import type { TimeEntryPage, TimeEntryFilters } from '@/lib/repositories/timeEntries'
import type { ProjectSummary } from '@/lib/repositories/projects'
import type { TagSummary } from '@/lib/repositories/tags'

interface PomodoroConfig {
  workMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  sessionsBeforeLongBreak: number
}

type WeekDay = { label: string; totalMs: number; isToday: boolean }

interface Props {
  entriesPage: TimeEntryPage
  projects: ProjectSummary[]
  tags: TagSummary[]
  filters: TimeEntryFilters
  pomodoroConfig: PomodoroConfig
  dailyTargetHours: number
  todayTotalMs: number
  entrySaveTime: number
  weekDayTotals: WeekDay[]
}

export default function EntriesView({ entriesPage, projects, tags, filters, pomodoroConfig, dailyTargetHours, todayTotalMs, entrySaveTime, weekDayTotals }: Props) {
  const router = useRouter()
  const [showAddDialog, setShowAddDialog] = useState(false)

  // Column visibility (lifted from EntriesTable so EntryFilters can render the Columns button)
  const [visibleCols, setVisibleCols] = useState<Record<ColumnId, boolean>>(() => loadColumnPrefs())

  function toggleColumn(id: ColumnId) {
    setVisibleCols(prev => {
      const next = { ...prev, [id]: !prev[id] }
      localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  return (
    <>
      <TimerWidget
        projects={projects}
        tags={tags}
        pomodoroConfig={pomodoroConfig}
        dailyTargetHours={dailyTargetHours}
        todayTotalMs={todayTotalMs}
        entrySaveTime={entrySaveTime}
        weekDayTotals={weekDayTotals}
        onEntrySaved={() => router.refresh()}
      />

      <EntryFilters
        projects={projects}
        filters={filters}
        onAddEntry={() => setShowAddDialog(true)}
        allColumns={ALL_COLUMNS}
        visibleCols={visibleCols}
        onToggleColumn={toggleColumn as (id: string) => void}
      />

      <div className="mt-4 w-full overflow-x-auto min-w-0">
        <EntriesTable
          entriesPage={entriesPage}
          projects={projects}
          tags={tags}
          filters={filters}
          visibleCols={visibleCols}
        />
      </div>

      <EntryFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        projects={projects}
        tags={tags}
        onSaved={() => router.refresh()}
      />
    </>
  )
}
