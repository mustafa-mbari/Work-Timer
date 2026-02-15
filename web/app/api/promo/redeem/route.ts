import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/services/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { getStripe, STRIPE_PRICES } from '@/lib/stripe'
import { promoRedeemSchema, parseBody } from '@/lib/validation'

export async function POST(request: NextRequest) {
  const user = await requireAuthApi()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = parseBody(promoRedeemSchema, await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { code } = parsed.data

  // Use service role client to call the atomic RPC
  const supabase = await createServiceClient()
  const rpcArgs = { p_code: code.toUpperCase(), p_user_id: user.id }
  // Type assertion needed: supabase-js v2.95 cannot resolve complex RPC return types
  const { data, error } = await (supabase.rpc as Function)('redeem_promo', rpcArgs)

  if (error) {
    console.error('[promo redeem] RPC error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to redeem promo code' }, { status: 400 })
  }

  // RPC returns: { success, error, granted, plan, discount_pct, promo_id, promo_code }
  const result = data as { success: boolean; error: string | null; granted: boolean | null; plan: string | null; discount_pct: number | null; promo_id: string | null; promo_code: string | null }

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error || 'Failed to redeem promo code' }, { status: 400 })
  }

  // 100% discount = premium already granted by the RPC
  if (result.discount_pct === 100) {
    return NextResponse.json({ success: true })
  }

  // Partial discount — create Stripe checkout session with coupon
  try {
    const coupon = await getStripe().coupons.create({
      percent_off: result.discount_pct!,
      duration: 'once',
      name: `Promo ${code.toUpperCase()}`,
    })

    const planKey = result.plan === 'premium_yearly' ? 'yearly'
      : result.plan === 'premium_lifetime' ? 'lifetime'
      : 'monthly'
    const priceId = STRIPE_PRICES[planKey as keyof typeof STRIPE_PRICES]
    const isLifetime = result.plan === 'premium_lifetime'
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!

    const session = await getStripe().checkout.sessions.create({
      mode: isLifetime ? 'payment' : 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      discounts: [{ coupon: coupon.id }],
      client_reference_id: user.id,
      customer_email: user.email,
      success_url: `${siteUrl}/billing?success=true`,
      cancel_url: `${siteUrl}/billing`,
      metadata: { userId: user.id, plan: planKey, promoCode: code.toUpperCase() },
    })

    return NextResponse.json({ success: true, checkoutUrl: session.url })
  } catch (err) {
    console.error('[promo redeem] Failed to create checkout with coupon:', err)
    return NextResponse.json({ success: false, error: 'Failed to apply discount' }, { status: 500 })
  }
}
