import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/services/auth'
import { spamCheckSchema, parseBody } from '@/lib/validation'

export async function POST(request: NextRequest) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = parseBody(spamCheckSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { html, options } = parsed.data

  try {
    const res = await fetch('https://spamcheck.postmarkapp.com/filter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: html, options }),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Spamcheck API unavailable' }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to reach spamcheck service' }, { status: 502 })
  }
}
