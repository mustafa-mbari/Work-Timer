import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/services/auth'
import { getGroupById } from '@/lib/repositories/groups'
import { submitShare } from '@/lib/repositories/groupShares'
import { submitShareSchema, parseBody } from '@/lib/validation'

type Params = { params: Promise<{ id: string; shareId: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, shareId } = await params
  const group = await getGroupById(id, user.id)
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

  const parsed = parseBody(submitShareSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { error } = await submitShare(shareId, user.id, parsed.data.project_ids, parsed.data.tag_ids)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
