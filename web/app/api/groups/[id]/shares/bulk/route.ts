import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/services/auth'
import { getGroupById } from '@/lib/repositories/groups'
import { adminBulkCreateOpenShares } from '@/lib/repositories/groupShares'
import { adminCreateShareSchema, parseBody } from '@/lib/validation'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const group = await getGroupById(id, user.id)
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

  if (group.userRole !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const parsed = parseBody(adminCreateShareSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { created, skipped, error } = await adminBulkCreateOpenShares(
    id,
    parsed.data.period_type,
    parsed.data.date_from,
    parsed.data.date_to,
    parsed.data.due_date ?? null,
  )

  if (error && created === 0) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ created, skipped, error: error?.message ?? null }, { status: 201 })
}
