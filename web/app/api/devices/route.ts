import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/services/auth'
import { getUserSyncCursors, deleteSyncCursor } from '@/lib/repositories/syncCursors'
import { deleteDeviceSchema, parseBody } from '@/lib/validation'

export async function GET() {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cursors = await getUserSyncCursors(user.id)
  return NextResponse.json(cursors)
}

export async function DELETE(request: NextRequest) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = parseBody(deleteDeviceSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { error } = await deleteSyncCursor(user.id, parsed.data.device_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
