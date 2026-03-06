import { NextRequest, NextResponse } from 'next/server'
import { expireOverdueSubscriptions } from '@/lib/repositories/subscriptions'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { expired, error } = await expireOverdueSubscriptions()

    if (error) {
      console.error('[cron/expire-subscriptions] DB error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    console.log(`[cron/expire-subscriptions] Expired ${expired.length} subscriptions:`, expired)
    return NextResponse.json({ expired: expired.length, details: expired })
  } catch (err) {
    console.error('[cron/expire-subscriptions] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
