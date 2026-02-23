import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session) {
    return NextResponse.json({ error: 'No active session' }, { status: 401 })
  }

  return NextResponse.json({
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
  })
}
