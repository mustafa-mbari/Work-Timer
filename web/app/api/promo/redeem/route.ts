import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getStripe, STRIPE_PRICES } from '@/lib/stripe'

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

  // Use service role for atomic operations
  const serviceSupabase = await createServiceClient()

  // Fetch and validate promo code
  const { data: promo, error: promoError } = await (serviceSupabase
    .from('promo_codes') as any)
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('active', true)
    .single()

  if (promoError || !promo) {
    return NextResponse.json({ success: false, error: 'Invalid promo code' }, { status: 404 })
  }

  // Check expiry
  const now = new Date()
  if (promo.valid_from && new Date(promo.valid_from) > now) {
    return NextResponse.json({ success: false, error: 'Promo code is not yet valid' }, { status: 400 })
  }
  if (promo.valid_until && new Date(promo.valid_until) < now) {
    return NextResponse.json({ success: false, error: 'Promo code has expired' }, { status: 400 })
  }

  // Check max uses
  if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
    return NextResponse.json({ success: false, error: 'Promo code has reached its usage limit' }, { status: 400 })
  }

  // Check if user already redeemed
  const { data: existing } = await (serviceSupabase
    .from('promo_redemptions') as any)
    .select('id')
    .eq('promo_code_id', promo.id)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    return NextResponse.json({ success: false, error: 'You have already used this promo code' }, { status: 400 })
  }

  // Record redemption and increment usage
  await (serviceSupabase.from('promo_redemptions') as any).insert({
    promo_code_id: promo.id,
    user_id: user.id,
  })

  await (serviceSupabase.from('promo_codes') as any)
    .update({ current_uses: promo.current_uses + 1 })
    .eq('id', promo.id)

  // 100% discount = grant premium directly, no Stripe
  if (promo.discount_pct === 100) {
    const { error } = await (serviceSupabase.from('subscriptions') as any).upsert({
      user_id: user.id,
      plan: promo.plan,
      status: 'active',
      granted_by: 'promo',
      promo_code_id: promo.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (error) {
      console.error('[promo redeem] Failed to grant premium:', error)
      return NextResponse.json({ success: false, error: 'Failed to activate premium' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  // Partial discount — create Stripe checkout session with coupon
  try {
    // Create a one-time Stripe coupon for this redemption
    const coupon = await getStripe().coupons.create({
      percent_off: promo.discount_pct,
      duration: 'once',
      name: `Promo ${promo.code}`,
    })

    const planKey = promo.plan === 'premium_yearly' ? 'yearly'
      : promo.plan === 'premium_lifetime' ? 'lifetime'
      : 'monthly'
    const priceId = STRIPE_PRICES[planKey as keyof typeof STRIPE_PRICES]
    const isLifetime = promo.plan === 'premium_lifetime'
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!

    const session = await getStripe().checkout.sessions.create({
      mode: isLifetime ? 'payment' : 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      discounts: [{ coupon: coupon.id }],
      client_reference_id: user.id,
      customer_email: user.email,
      success_url: `${siteUrl}/billing?success=true`,
      cancel_url: `${siteUrl}/billing`,
      metadata: { userId: user.id, plan: planKey, promoCode: promo.code },
    })

    return NextResponse.json({ success: true, checkoutUrl: session.url })
  } catch (err) {
    console.error('[promo redeem] Failed to create checkout with coupon:', err)
    return NextResponse.json({ success: false, error: 'Failed to apply discount' }, { status: 500 })
  }
}
