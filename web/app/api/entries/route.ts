import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/services/auth'
import { isPremiumUser } from '@/lib/services/billing'
import {
  getUserTimeEntries,
  createTimeEntry,
  deleteTimeEntries,
} from '@/lib/repositories/timeEntries'
import { createTimeEntrySchema, bulkDeleteEntriesSchema, parseBody } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isPremiumUser(user.id)))
    return NextResponse.json({ error: 'Premium required' }, { status: 403 })

  const sp = request.nextUrl.searchParams
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get('pageSize') ?? '50', 10) || 50))

  const result = await getUserTimeEntries(user.id, {
    dateFrom: sp.get('dateFrom') ?? undefined,
    dateTo: sp.get('dateTo') ?? undefined,
    projectId: sp.get('projectId') ?? undefined,
    type: sp.get('type') ?? undefined,
    page,
    pageSize,
  })

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isPremiumUser(user.id)))
    return NextResponse.json({ error: 'Premium required' }, { status: 403 })

  const body = await request.json()
  // If no id provided, generate one server-side
  if (!body.id) body.id = crypto.randomUUID()

  const parsed = parseBody(createTimeEntrySchema, body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { error } = await createTimeEntry(user.id, parsed.data)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, id: parsed.data.id }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isPremiumUser(user.id)))
    return NextResponse.json({ error: 'Premium required' }, { status: 403 })

  const parsed = parseBody(bulkDeleteEntriesSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { error } = await deleteTimeEntries(user.id, parsed.data.ids)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
