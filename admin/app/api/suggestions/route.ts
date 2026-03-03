import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/services/auth'
import { getAllSuggestions, updateSuggestionStatus } from '@/lib/repositories/featureSuggestions'
import { updateSuggestionStatusSchema, parseBody } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = request.nextUrl
  const status = searchParams.get('status') || undefined
  const importance = searchParams.get('importance') || undefined

  const suggestions = await getAllSuggestions({ status, importance })
  return NextResponse.json({ suggestions })
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = parseBody(updateSuggestionStatusSchema, await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { id, status, admin_notes } = parsed.data
  const { error } = await updateSuggestionStatus(id, status, admin_notes)

  if (error) {
    console.error('Suggestion update error:', error)
    return NextResponse.json({ error: 'Failed to update suggestion' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
