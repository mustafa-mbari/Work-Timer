import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/services/auth'
import { getUserSettings, upsertUserSettings } from '@/lib/repositories/userSettings'
import { updateSettingsSchema, parseBody } from '@/lib/validation'

export async function GET() {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await getUserSettings(user.id)
  return NextResponse.json(settings)
}

export async function PUT(request: NextRequest) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = parseBody(updateSettingsSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { error } = await upsertUserSettings(user.id, parsed.data)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
