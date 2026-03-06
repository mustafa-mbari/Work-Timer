import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/services/auth'
import { updateProject, deleteProject, setDefaultProject } from '@/lib/repositories/projects'
import { updateProjectSchema, parseBody } from '@/lib/validation'
import { withApiQuota } from '@/lib/apiQuota'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const quotaBlocked = await withApiQuota(user.id, 'projects')
  if (quotaBlocked) return quotaBlocked

  const { id } = await params
  const body = await request.json()
  const parsed = parseBody(updateProjectSchema, body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { error } = await updateProject(user.id, id, parsed.data)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function PATCH(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const quotaBlocked = await withApiQuota(user.id, 'projects')
  if (quotaBlocked) return quotaBlocked

  const { id } = await params
  const { error } = await setDefaultProject(user.id, id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const quotaBlocked = await withApiQuota(user.id, 'projects')
  if (quotaBlocked) return quotaBlocked

  const { id } = await params
  const { error } = await deleteProject(user.id, id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
