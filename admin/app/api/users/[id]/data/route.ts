import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/services/auth'
import {
  clearUserEntries,
  clearUserProjects,
  clearUserTags,
  resetUserSettings,
  clearUserSyncCursors,
  resetUserQuotas,
} from '@/lib/repositories/admin'
import { deleteUserDataSchema, parseBody } from '@/lib/validation'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const parsed = parseBody(deleteUserDataSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { type, dateFrom, dateTo } = parsed.data

  try {
    const result: Record<string, number | boolean> = {}

    switch (type) {
      case 'entries':
        result.deleted = await clearUserEntries(id, dateFrom, dateTo)
        break
      case 'projects':
        result.deleted = await clearUserProjects(id)
        break
      case 'tags':
        result.deleted = await clearUserTags(id)
        break
      case 'settings':
        await resetUserSettings(id)
        result.reset = true
        break
      case 'sync_cursors':
        await clearUserSyncCursors(id)
        result.reset = true
        break
      case 'quotas':
        await resetUserQuotas(id)
        result.reset = true
        break
      case 'all': {
        const [entries, projects, tags] = await Promise.all([
          clearUserEntries(id),
          clearUserProjects(id),
          clearUserTags(id),
        ])
        await Promise.all([
          resetUserSettings(id),
          clearUserSyncCursors(id),
          resetUserQuotas(id),
        ])
        result.entries = entries
        result.projects = projects
        result.tags = tags
        break
      }
    }

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete user data'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
