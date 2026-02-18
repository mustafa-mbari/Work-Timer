import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/services/auth'
import { isPremiumUser } from '@/lib/services/billing'
import {
  getUserTimeEntryById,
  updateTimeEntry,
  deleteTimeEntries,
} from '@/lib/repositories/timeEntries'
import { updateTimeEntrySchema, parseBody } from '@/lib/validation'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isPremiumUser(user.id)))
    return NextResponse.json({ error: 'Premium required' }, { status: 403 })

  const { id } = await params
  const { data, error } = await getUserTimeEntryById(user.id, id)
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isPremiumUser(user.id)))
    return NextResponse.json({ error: 'Premium required' }, { status: 403 })

  const { id } = await params
  const parsed = parseBody(updateTimeEntrySchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { error } = await updateTimeEntry(user.id, id, parsed.data)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isPremiumUser(user.id)))
    return NextResponse.json({ error: 'Premium required' }, { status: 403 })

  const { id } = await params
  const { error } = await deleteTimeEntries(user.id, [id])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
