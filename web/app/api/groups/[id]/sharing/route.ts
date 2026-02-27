import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/services/auth'
import { getSharingSettings, upsertSharingSettings } from '@/lib/repositories/groupSharing'
import { getGroupById } from '@/lib/repositories/groups'
import { updateSharingSettingsSchema, parseBody } from '@/lib/validation'

type Params = { params: Promise<{ id: string }> }

// GET own sharing settings for a group
export async function GET(_request: NextRequest, { params }: Params) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const group = await getGroupById(id, user.id)
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

  const settings = await getSharingSettings(id, user.id)
  return NextResponse.json(settings)
}

// PUT update sharing settings (own, or admin can update any member via ?userId=)
export async function PUT(request: NextRequest, { params }: Params) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const group = await getGroupById(id, user.id)
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

  const parsed = parseBody(updateSharingSettingsSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  // Admin can update another member's sharing via ?userId=
  const targetUserId = request.nextUrl.searchParams.get('userId')
  if (targetUserId && targetUserId !== user.id) {
    if (group.userRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const { error } = await upsertSharingSettings(id, targetUserId, parsed.data)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const { error } = await upsertSharingSettings(id, user.id, parsed.data)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
