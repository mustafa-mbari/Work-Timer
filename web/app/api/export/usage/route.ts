import { NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/services/auth'
import { getUserExportQuota } from '@/lib/repositories/exportUsage'

export async function GET() {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const quota = await getUserExportQuota(user.id)
    return NextResponse.json(quota)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch export quota' },
      { status: 500 },
    )
  }
}
