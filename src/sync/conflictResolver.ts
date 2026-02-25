// Last-write-wins (LWW) conflict resolution based on updated_at timestamp.
// When a remote record has a newer updated_at than the local version, the remote wins.

import type { TimeEntry, Project, Tag, Settings } from '@/types'
import type { DbTimeEntry, DbProject, DbTag, DbUserSettings } from '@shared/types'

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
    isDefault: db.is_default ?? false,
    order: db.sort_order ?? undefined,
    defaultTagId: db.default_tag_id ?? undefined,
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
    is_default: project.isDefault ?? false,
    default_tag_id: project.defaultTagId ?? null,
    sort_order: project.order ?? null,
    created_at: project.createdAt,
    updated_at: new Date().toISOString(),
  }
}

/** Convert a Supabase DbTag to a local Tag */
export function dbTagToLocal(db: DbTag): Tag {
  return {
    id: db.id,
    name: db.name,
    color: db.color ?? '#6366F1',
    isDefault: db.is_default ?? false,
    order: db.sort_order ?? undefined,
  }
}

/** Convert a local Tag to a Supabase DbTag row for upsert */
export function localTagToDb(tag: Tag, userId: string): Partial<DbTag> {
  return {
    id: tag.id,
    user_id: userId,
    name: tag.name,
    color: tag.color ?? '#6366F1',
    is_default: tag.isDefault ?? false,
    sort_order: tag.order ?? null,
    updated_at: new Date().toISOString(),
  }
}

/** Convert local Settings to a Supabase DbUserSettings row for upsert */
export function localSettingsToDb(settings: Settings, userId: string): Partial<DbUserSettings> {
  return {
    user_id: userId,
    working_days: settings.workingDays,
    week_start_day: settings.weekStartDay,
    idle_timeout: settings.idleTimeout,
    theme: settings.theme,
    language: settings.language,
    notifications: settings.notifications,
    daily_target: settings.dailyTarget,
    weekly_target: settings.weeklyTarget,
    pomodoro_config: settings.pomodoro,
    floating_timer_auto: settings.floatingTimerAutoShow,
    reminder: settings.reminder,
    entry_save_time: settings.entrySaveTime,
    updated_at: new Date().toISOString(),
  }
}

/** Convert a Supabase DbUserSettings to local Settings */
export function dbSettingsToLocal(db: DbUserSettings): Settings {
  return {
    workingDays: db.working_days,
    weekStartDay: db.week_start_day,
    idleTimeout: db.idle_timeout,
    theme: db.theme as Settings['theme'],
    language: db.language as Settings['language'],
    notifications: db.notifications,
    dailyTarget: db.daily_target,
    weeklyTarget: db.weekly_target,
    pomodoro: db.pomodoro_config,
    floatingTimerAutoShow: db.floating_timer_auto,
    reminder: db.reminder,
    entrySaveTime: db.entry_save_time ?? 10,
  }
}
