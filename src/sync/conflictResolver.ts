// Last-write-wins (LWW) conflict resolution based on updated_at timestamp.
// When a remote record has a newer updated_at than the local version, the remote wins.

import type { TimeEntry, Project, Tag } from '@/types'
import type { DbTimeEntry, DbProject, DbTag } from '@shared/types'

/** Returns true if the remote record is newer and should overwrite local */
export function remoteWins(localUpdatedAt: number, remoteUpdatedAt: string): boolean {
  const remoteMs = new Date(remoteUpdatedAt).getTime()
  return remoteMs > localUpdatedAt
}

/** Convert a Supabase DbTimeEntry to a local TimeEntry */
export function dbEntryToLocal(db: DbTimeEntry): TimeEntry {
  return {
    id: db.id,
    date: db.date,
    startTime: db.start_time,
    endTime: db.end_time,
    duration: db.duration,
    projectId: db.project_id ?? null,
    taskId: db.task_id ?? null,
    description: db.description,
    type: db.type,
    tags: db.tags ?? [],
    link: db.link ?? undefined,
  }
}

/** Convert a local TimeEntry to a Supabase DbTimeEntry row for upsert */
export function localEntryToDb(entry: TimeEntry, userId: string): Partial<DbTimeEntry> {
  return {
    id: entry.id,
    user_id: userId,
    date: entry.date,
    start_time: entry.startTime,
    end_time: entry.endTime,
    duration: entry.duration,
    project_id: entry.projectId ?? null,
    task_id: entry.taskId ?? null,
    description: entry.description,
    type: entry.type,
    tags: entry.tags,
    link: entry.link ?? null,
    updated_at: new Date().toISOString(),
  }
}

/** Convert a Supabase DbProject to a local Project */
export function dbProjectToLocal(db: DbProject): Project {
  return {
    id: db.id,
    name: db.name,
    color: db.color,
    targetHours: db.target_hours ?? null,
    archived: db.archived,
    createdAt: db.created_at,
  }
}

/** Convert a local Project to a Supabase DbProject row for upsert */
export function localProjectToDb(project: Project, userId: string): Partial<DbProject> {
  return {
    id: project.id,
    user_id: userId,
    name: project.name,
    color: project.color,
    target_hours: project.targetHours ?? null,
    archived: project.archived,
    created_at: project.createdAt,
    updated_at: new Date().toISOString(),
  }
}

/** Convert a Supabase DbTag to a local Tag */
export function dbTagToLocal(db: DbTag): Tag {
  return {
    id: db.id,
    name: db.name,
  }
}
