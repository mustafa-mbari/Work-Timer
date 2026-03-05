import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/services/auth'
import { trackExport } from '@/lib/repositories/exportUsage'
import { trackExportSchema, parseBody } from '@/lib/validation'

export async function POST(request: NextRequest) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = parseBody(trackExportSchema, body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const result = await trackExport(user.id, parsed.data.type)

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: 'Export limit reached',
        used: result.used,
        limit: result.limit,
      },
      { status: 429 },
    )
  }

  return NextResponse.json({
    allowed: true,
    used: result.used,
    limit: result.limit,
    remaining: Math.max(result.limit - result.used, 0),
  })
}
