import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/services/auth'
import { deleteGroupShare, getShareById } from '@/lib/repositories/groupShares'
import { getGroupById } from '@/lib/repositories/groups'
import { createServiceClient } from '@/lib/supabase/server'
import { updateShareDraftSchema, parseBody } from '@/lib/validation'

type Params = { params: Promise<{ id: string; shareId: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, shareId } = await params
  const group = await getGroupById(id, user.id)
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

  const share = await getShareById(shareId)
  if (!share) return NextResponse.json({ error: 'Share not found' }, { status: 404 })

  // Only the share owner or group admin can view full share details
  if (share.user_id !== user.id && group.userRole !== 'admin') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  return NextResponse.json(share)
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { shareId } = await params
  const { error } = await deleteGroupShare(shareId, user.id)
  if (error) {
    const msg = error.message
    const status = msg.includes('not open') || msg.includes('Not your') ? 400 : 500
    return NextResponse.json({ error: msg }, { status })
  }

  return NextResponse.json({ ok: true })
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { shareId } = await params
  const share = await getShareById(shareId)
  if (!share) return NextResponse.json({ error: 'Share not found' }, { status: 404 })
  if (share.user_id !== user.id) return NextResponse.json({ error: 'Not your share' }, { status: 403 })
  if (share.status !== 'open') return NextResponse.json({ error: 'Share is not open' }, { status: 400 })

  const parsed = parseBody(updateShareDraftSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (parsed.data.project_ids !== undefined) updates.project_ids = parsed.data.project_ids
  if (parsed.data.tag_ids !== undefined) updates.tag_ids = parsed.data.tag_ids
  if (parsed.data.note !== undefined) updates.note = parsed.data.note

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('group_shares') as any)
    .update(updates)
    .eq('id', shareId)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
