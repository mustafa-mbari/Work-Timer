import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/services/auth'
import { getUserPendingInvitations, acceptInvitation, declineInvitation } from '@/lib/repositories/groupInvitations'
import { invitationActionSchema, parseBody } from '@/lib/validation'

export async function GET() {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const invitations = await getUserPendingInvitations(user.email ?? '')
  return NextResponse.json(invitations)
}

export async function POST(request: NextRequest) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = parseBody(invitationActionSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { invitation_id, action } = parsed.data

  if (action === 'accept') {
    const { error } = await acceptInvitation(invitation_id, user.id, user.email ?? '')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await declineInvitation(invitation_id, user.email ?? '')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
