import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/services/auth'
import { getAllPromoCodes, createPromoCode, updatePromoCodeActive } from '@/lib/repositories/promoCodes'
import { promoCreateSchema, promoToggleSchema, parseBody } from '@/lib/validation'

export async function GET() {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const promos = await getAllPromoCodes()
  return NextResponse.json({ promos })
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = parseBody(promoCreateSchema, await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { code, discount_pct, plan, max_uses } = parsed.data
  const { error } = await createPromoCode({ code, discount_pct, plan, max_uses })

  if (error) {
    console.error('Promo code insert error:', error)
    const msg = error.message?.includes('duplicate')
      ? 'Promo code already exists'
      : error.message || 'Failed to create promo code'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = parseBody(promoToggleSchema, await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { error } = await updatePromoCodeActive(parsed.data.id, parsed.data.active)

  if (error) {
    return NextResponse.json({ error: 'Failed to update promo code' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
