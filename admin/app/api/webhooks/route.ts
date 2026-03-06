import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/services/auth'
import { getWebhookStats, getRecentWebhookLogs } from '@/lib/repositories/webhookLogs'

export async function GET(request: NextRequest) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view') || 'overview'

  if (view === 'overview') {
    const stats = await getWebhookStats()
    return NextResponse.json(stats)
  }

  // view === 'logs'
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '25', 10)))
  const status = searchParams.get('status') || undefined

  const result = await getRecentWebhookLogs(page, pageSize, status)
  return NextResponse.json({ logs: result.logs, total: result.total, page, pageSize })
}
