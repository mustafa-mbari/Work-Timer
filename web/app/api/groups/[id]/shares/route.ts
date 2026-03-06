import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/services/auth'
import { getGroupById } from '@/lib/repositories/groups'
import {
  getGroupShares, getMemberShares, createGroupShare,
  getSharesByStatus, autoCreateOpenShare, type ShareStatus,
} from '@/lib/repositories/groupShares'
import { getSharingSettings } from '@/lib/repositories/groupSharing'
import { createShareSchema, parseBody } from '@/lib/validation'

type Params = { params: Promise<{ id: string }> }

// ─── Period helpers ──────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getCurrentPeriodDates(frequency: string, deadlineDay: number | null) {
  const now = new Date()

  if (frequency === 'daily') {
    const today = formatDate(now)
    return { dateFrom: today, dateTo: today, dueDate: today, periodType: 'day' as const }
  }

  if (frequency === 'weekly') {
    const mon = new Date(now)
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    const due = new Date(mon)
    due.setDate(mon.getDate() + (deadlineDay ?? 4)) // default Friday
    return { dateFrom: formatDate(mon), dateTo: formatDate(sun), dueDate: formatDate(due), periodType: 'week' as const }
  }

  // monthly
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const dueDay = Math.min(deadlineDay ?? last.getDate(), last.getDate())
  const due = new Date(now.getFullYear(), now.getMonth(), dueDay)
  return { dateFrom: formatDate(first), dateTo: formatDate(last), dueDate: formatDate(due), periodType: 'month' as const }
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest, { params }: Params) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const group = await getGroupById(id, user.id)
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

  const statusParam = request.nextUrl.searchParams.get('status') as ShareStatus | null
  const mine = request.nextUrl.searchParams.get('mine') === 'true'

  // Status-filtered queries
  if (statusParam) {
    const validStatuses: ShareStatus[] = ['open', 'submitted', 'approved', 'denied']
    if (!validStatuses.includes(statusParam)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Auto-create open share for member if schedule is configured.
    // DB unique partial index prevents duplicates — no pre-check queries needed.
    if (statusParam === 'open' && mine && group.share_frequency) {
      const sharing = await getSharingSettings(id, user.id)
      if (sharing.sharing_enabled) {
        const period = getCurrentPeriodDates(group.share_frequency, group.share_deadline_day)
        await autoCreateOpenShare(id, user.id, period.periodType, period.dateFrom, period.dateTo, period.dueDate)
      }
    }

    const shares = mine || group.userRole !== 'admin'
      ? await getSharesByStatus(id, statusParam, user.id)
      : await getSharesByStatus(id, statusParam)

    return NextResponse.json(shares)
  }

  // Legacy: ?mine=true or non-admin → own shares only
  if (mine || group.userRole !== 'admin') {
    const shares = await getMemberShares(id, user.id)
    return NextResponse.json(shares)
  }

  // Admin default: all shares
  const shares = await getGroupShares(id)
  return NextResponse.json(shares)
}

// ─── POST ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const group = await getGroupById(id, user.id)
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

  const parsed = parseBody(createShareSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data, error } = await createGroupShare(id, user.id, parsed.data)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
