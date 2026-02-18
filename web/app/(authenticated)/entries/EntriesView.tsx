'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import EntryFilters from './EntryFilters'
import EntriesTable from './EntriesTable'
import EntryFormDialog from './EntryFormDialog'
import type { TimeEntryPage, TimeEntryFilters } from '@/lib/repositories/timeEntries'
import type { ProjectSummary } from '@/lib/repositories/projects'

interface Props {
  entriesPage: TimeEntryPage
  projects: ProjectSummary[]
  filters: TimeEntryFilters
}

export default function EntriesView({ entriesPage, projects, filters }: Props) {
  const router = useRouter()
  const [showAddDialog, setShowAddDialog] = useState(false)

  return (
    <>
      <EntryFilters
        projects={projects}
        filters={filters}
        onAddEntry={() => setShowAddDialog(true)}
      />

      <div className="mt-4">
        <EntriesTable
          entriesPage={entriesPage}
          projects={projects}
          filters={filters}
        />
      </div>

      <EntryFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        projects={projects}
        onSaved={() => router.refresh()}
      />
    </>
  )
}
