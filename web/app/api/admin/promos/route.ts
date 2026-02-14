import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const VALID_PLANS = ['premium_monthly', 'premium_yearly', 'premium_lifetime']

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const serviceSupabase = await createServiceClient()
  const { data: profile } = await (serviceSupabase.from('profiles') as any)
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return null
  return serviceSupabase
}

export async function GET() {
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await (supabase.from('promo_codes') as any)
    .select('*')
    .order('created_at', { ascending: false })

  return NextResponse.json({ promos: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { code, discount_pct, plan, max_uses } = await request.json()

  if (!code || typeof code !== 'string' || code.length < 3 || code.length > 50) {
    return NextResponse.json({ error: 'Code must be 3-50 characters' }, { status: 400 })
  }

  if (typeof discount_pct !== 'number' || discount_pct < 1 || discount_pct > 100) {
    return NextResponse.json({ error: 'Discount must be between 1% and 100%' }, { status: 400 })
  }

  if (!VALID_PLANS.includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  if (max_uses !== null && max_uses !== undefined && (typeof max_uses !== 'number' || max_uses < 1)) {
    return NextResponse.json({ error: 'Max uses must be a positive number' }, { status: 400 })
  }

  const { error } = await (supabase.from('promo_codes') as any).insert({
    code: code.trim().toUpperCase(),
    discount_pct,
    plan,
    max_uses: max_uses || null,
    current_uses: 0,
    active: true,
  })

  if (error) {
    const msg = error.message?.includes('duplicate') ? 'Promo code already exists' : 'Failed to create promo code'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(request: NextRequest) {
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, active } = await request.json()

  if (!id || typeof active !== 'boolean') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { error } = await (supabase.from('promo_codes') as any)
    .update({ active })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Failed to update promo code' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
