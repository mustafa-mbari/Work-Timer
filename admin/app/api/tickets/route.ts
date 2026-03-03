import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/services/auth'
import { getAllTickets, updateTicketStatus } from '@/lib/repositories/supportTickets'
import { updateTicketStatusSchema, parseBody } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = request.nextUrl
  const status = searchParams.get('status') || undefined
  const priority = searchParams.get('priority') || undefined

  const tickets = await getAllTickets({ status, priority })
  return NextResponse.json({ tickets })
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = parseBody(updateTicketStatusSchema, await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { id, status, admin_notes } = parsed.data
  const { error } = await updateTicketStatus(id, status, admin_notes)

  if (error) {
    console.error('Ticket update error:', error)
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
