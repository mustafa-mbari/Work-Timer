import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/services/auth'
import { getAllDomains, createDomain, updateDomainActive } from '@/lib/repositories/domains'
import { domainCreateSchema, domainToggleSchema, parseBody } from '@/lib/validation'

export async function GET() {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const domains = await getAllDomains()
  return NextResponse.json({ domains })
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = parseBody(domainCreateSchema, await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { domain, plan } = parsed.data
  const { error } = await createDomain({ domain, plan, active: true })

  if (error) {
    const msg = error.message?.includes('duplicate') ? 'Domain already exists' : 'Failed to add domain'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = parseBody(domainToggleSchema, await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { error } = await updateDomainActive(parsed.data.id, parsed.data.active)

  if (error) {
    return NextResponse.json({ error: 'Failed to update domain' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
