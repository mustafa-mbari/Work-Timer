import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/services/auth'
import { updateProfileDisplayName } from '@/lib/repositories/profiles'
import { updateProfileSchema, parseBody } from '@/lib/validation'

export async function PATCH(request: NextRequest) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = parseBody(updateProfileSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { error } = await updateProfileDisplayName(user.id, parsed.data.displayName)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
