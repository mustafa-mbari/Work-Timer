import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { code } = await request.json() as { code: string }

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Promo code is required' }, { status: 400 })
  }

  // Fetch promo code
  const { data: promo, error: promoError } = await (supabase
    .from('promo_codes') as any)
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (promoError || !promo) {
    return NextResponse.json({ valid: false, error: 'Invalid promo code' }, { status: 404 })
  }

  // Check if active
  if (!promo.active) {
    return NextResponse.json({ valid: false, error: 'This promo code is no longer active' }, { status: 400 })
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
  const { data: redemption } = await (supabase
    .from('promo_redemptions') as any)
    .select('id')
    .eq('promo_code_id', promo.id)
    .eq('user_id', user.id)
    .single()

  if (redemption) {
    return NextResponse.json({ valid: false, error: 'You have already used this promo code' }, { status: 400 })
  }

  // Valid promo code
  return NextResponse.json({
    valid: true,
    promo: {
      code: promo.code,
      discount_pct: promo.discount_pct,
      plan: promo.plan,
    },
  })
}
