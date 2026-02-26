import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/services/auth'
import { getGroupById } from '@/lib/repositories/groups'
import { getSharePreview } from '@/lib/repositories/groupShares'
import { sharePreviewSchema, parseBody } from '@/lib/validation'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const group = await getGroupById(id, user.id)
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

  const parsed = parseBody(sharePreviewSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const preview = await getSharePreview(user.id, parsed.data)
  return NextResponse.json(preview)
}
