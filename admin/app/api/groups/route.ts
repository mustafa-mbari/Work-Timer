import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/services/auth'
import { updateGroupMaxMembers } from '@/lib/repositories/admin'
import { adminUpdateGroupSchema, parseBody } from '@/lib/validation'

export async function PATCH(request: NextRequest) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = parseBody(adminUpdateGroupSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  try {
    await updateGroupMaxMembers(parsed.data.group_id, parsed.data.max_members)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
