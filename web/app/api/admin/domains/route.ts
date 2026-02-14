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

  const { data } = await supabase
    .from('whitelisted_domains')
    .select('*')
    .order('created_at', { ascending: false })

  return NextResponse.json({ domains: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { domain, plan } = await request.json()

  if (!domain || typeof domain !== 'string' || !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain)) {
    return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 })
  }

  if (!VALID_PLANS.includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const { error } = await (supabase.from('whitelisted_domains') as any).insert({
    domain,
    plan,
    active: true,
  })

  if (error) {
    const msg = error.message?.includes('duplicate') ? 'Domain already exists' : 'Failed to add domain'
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

  const { error } = await (supabase.from('whitelisted_domains') as any)
    .update({ active })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Failed to update domain' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
