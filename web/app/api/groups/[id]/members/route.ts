import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/services/auth'
import { getGroupById, removeGroupMember, getGroupMemberCount } from '@/lib/repositories/groups'
import { createInvitation } from '@/lib/repositories/groupInvitations'
import { inviteMemberSchema, parseBody } from '@/lib/validation'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const group = await getGroupById(id, user.id)
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  if (group.userRole !== 'admin') return NextResponse.json({ error: 'Admin role required' }, { status: 403 })

  const parsed = parseBody(inviteMemberSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  // Check member count vs max
  const memberCount = await getGroupMemberCount(id)
  if (memberCount >= group.max_members) {
    return NextResponse.json({ error: 'Group is at maximum capacity' }, { status: 400 })
  }

  const { data, error } = await createInvitation(id, parsed.data.email, user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

  const group = await getGroupById(id, user.id)
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  if (group.userRole !== 'admin' && userId !== user.id) {
    return NextResponse.json({ error: 'Admin role required to remove others' }, { status: 403 })
  }

  // Prevent owner from removing themselves
  if (userId === group.owner_id) {
    return NextResponse.json({ error: 'Owner cannot be removed. Delete the group instead.' }, { status: 400 })
  }

  const { error } = await removeGroupMember(id, userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
