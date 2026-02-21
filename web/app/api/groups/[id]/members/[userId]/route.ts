import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/services/auth'
import { getGroupById, updateMemberRole } from '@/lib/repositories/groups'
import { updateGroupMemberSchema, parseBody } from '@/lib/validation'

type Params = { params: Promise<{ id: string; userId: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, userId } = await params
  const group = await getGroupById(id, user.id)
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  if (group.userRole !== 'admin') return NextResponse.json({ error: 'Admin role required' }, { status: 403 })

  const parsed = parseBody(updateGroupMemberSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { error } = await updateMemberRole(id, userId, parsed.data.role)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
