import { NextRequest, NextResponse } from 'next/server'
import { getStripe, STRIPE_PRICES } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import type { PricePlan } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { plan } = await request.json() as { plan: PricePlan }

  if (!STRIPE_PRICES[plan]) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const isLifetime = plan === 'lifetime'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!

  const session = await getStripe().checkout.sessions.create({
    mode: isLifetime ? 'payment' : 'subscription',
    line_items: [{ price: STRIPE_PRICES[plan], quantity: 1 }],
    client_reference_id: user.id,
    customer_email: user.email,
    success_url: `${siteUrl}/billing?success=true`,
    cancel_url: `${siteUrl}/billing`,
    metadata: { userId: user.id, plan },
  })

  return NextResponse.json({ url: session.url })
}
