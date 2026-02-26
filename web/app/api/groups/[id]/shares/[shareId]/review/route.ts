import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/services/auth'
import { getGroupById } from '@/lib/repositories/groups'
import { reviewShare } from '@/lib/repositories/groupShares'
import { reviewShareSchema, parseBody } from '@/lib/validation'

type Params = { params: Promise<{ id: string; shareId: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, shareId } = await params
  const group = await getGroupById(id, user.id)
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

  if (group.userRole !== 'admin') {
    return NextResponse.json({ error: 'Only admins can review shares' }, { status: 403 })
  }

  const parsed = parseBody(reviewShareSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  if (parsed.data.action === 'deny' && !parsed.data.comment) {
    return NextResponse.json({ error: 'Comment is required when denying' }, { status: 400 })
  }

  const { error } = await reviewShare(shareId, user.id, parsed.data.action, parsed.data.comment)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
