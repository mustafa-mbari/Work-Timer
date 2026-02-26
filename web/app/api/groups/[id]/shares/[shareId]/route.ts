import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/services/auth'
import { deleteGroupShare } from '@/lib/repositories/groupShares'

type Params = { params: Promise<{ id: string; shareId: string }> }

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { shareId } = await params
  const { error } = await deleteGroupShare(shareId, user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
