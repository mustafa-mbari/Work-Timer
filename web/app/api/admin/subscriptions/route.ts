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

  const { data } = await (supabase.from('subscriptions') as any)
    .select(`
      *,
      profiles (
        email
      )
    `)
    .order('updated_at', { ascending: false })

  return NextResponse.json({ subscriptions: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, plan } = await request.json()

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  if (!VALID_PLANS.includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  // Find user by email via auth.admin (profiles table may be incomplete)
  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 10000 })
  const authUser = users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())

  if (!authUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Upsert subscription
  const { error } = await (supabase.from('subscriptions') as any).upsert({
    user_id: authUser.id,
    plan,
    status: 'active',
    granted_by: 'admin_manual',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  if (error) {
    return NextResponse.json({ error: 'Failed to grant premium' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
