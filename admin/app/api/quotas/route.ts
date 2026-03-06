import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/services/auth'
import { getAllApiQuotaLimits, upsertApiQuotaLimit } from '@/lib/repositories/apiQuota'
import { updateQuotaLimitSchema, parseBody } from '@/lib/validation'

export async function GET() {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const limits = await getAllApiQuotaLimits()
  return NextResponse.json({ limits })
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = parseBody(updateQuotaLimitSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { role_name, resource_type, monthly_limit } = parsed.data
  const { error } = await upsertApiQuotaLimit(role_name, resource_type, monthly_limit)

  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({ success: true })
}
