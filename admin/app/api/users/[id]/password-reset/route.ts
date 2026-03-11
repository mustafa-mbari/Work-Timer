import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/services/auth'
import { sendPasswordResetEmail } from '@/lib/repositories/admin'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  // Get the user's email from their profile
  const supabase = await createServiceClient()
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', id)
    .single<{ email: string }>()

  if (profileError || !profile?.email) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  try {
    await sendPasswordResetEmail(profile.email)
    return NextResponse.json({ success: true, email: profile.email })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send password reset'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
