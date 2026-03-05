import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/services/auth'
import { getEarningsReport } from '@/lib/services/earnings'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export async function GET(request: NextRequest) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const dateFrom = searchParams.get('dateFrom') ?? undefined
  const dateTo = searchParams.get('dateTo') ?? undefined
  const groupBy = searchParams.get('groupBy') === 'project' ? 'project' : 'tag'

  if (dateFrom && !ISO_DATE.test(dateFrom)) {
    return NextResponse.json({ error: 'Invalid dateFrom format' }, { status: 400 })
  }
  if (dateTo && !ISO_DATE.test(dateTo)) {
    return NextResponse.json({ error: 'Invalid dateTo format' }, { status: 400 })
  }

  try {
    const data = await getEarningsReport(user.id, dateFrom, dateTo, groupBy)
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch earnings' },
      { status: 500 },
    )
  }
}
