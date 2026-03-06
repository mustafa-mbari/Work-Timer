import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/services/auth'
import { getUserGroups, createGroup } from '@/lib/repositories/groups'
import { canCreateGroup } from '@/lib/services/groups'
import { createGroupSchema, parseBody } from '@/lib/validation'
import { withApiQuota } from '@/lib/apiQuota'

export async function GET() {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const groups = await getUserGroups(user.id)
  return NextResponse.json(groups)
}

export async function POST(request: NextRequest) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const quotaBlocked = await withApiQuota(user.id, 'groups')
  if (quotaBlocked) return quotaBlocked

  const canCreate = await canCreateGroup(user.id)
  if (!canCreate) {
    return NextResponse.json({ error: 'All-In subscription required to create groups' }, { status: 403 })
  }

  const parsed = parseBody(createGroupSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data, error } = await createGroup(parsed.data.name, user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
