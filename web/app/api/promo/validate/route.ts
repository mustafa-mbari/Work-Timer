import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/services/auth'
import { getPromoByCode, checkUserRedemption } from '@/lib/repositories/promoCodes'
import { promoValidateSchema, parseBody } from '@/lib/validation'

export async function POST(request: NextRequest) {
  const user = await requireAuthApi()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = parseBody(promoValidateSchema, await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { code } = parsed.data

  const { data: promo, error: promoError } = await getPromoByCode(code)

  if (promoError || !promo) {
    return NextResponse.json({ valid: false, error: 'Invalid promo code' }, { status: 400 })
  }

  // Check expiry
  const now = new Date()
  if (promo.valid_from && new Date(promo.valid_from) > now) {
    return NextResponse.json({ valid: false, error: 'This promo code is not yet valid' }, { status: 400 })
  }
  if (promo.valid_until && new Date(promo.valid_until) < now) {
    return NextResponse.json({ valid: false, error: 'This promo code has expired' }, { status: 400 })
  }

  // Check max uses
  if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
    return NextResponse.json({ valid: false, error: 'This promo code has reached its usage limit' }, { status: 400 })
  }

  // Check if user already redeemed this code
  const alreadyRedeemed = await checkUserRedemption(promo.id, user.id)
  if (alreadyRedeemed) {
    return NextResponse.json({ valid: false, error: 'You have already used this promo code' }, { status: 400 })
  }

  return NextResponse.json({
    valid: true,
    promo: {
      code: promo.code,
      discount_pct: promo.discount_pct,
      plan: promo.plan,
    },
  })
}
