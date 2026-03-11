import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/services/auth'
import {
  getUserDetails,
  deleteUser,
  updateUserRole,
  updateUserDisplayName,
} from '@/lib/repositories/admin'
import { updateUserSchema, parseBody } from '@/lib/validation'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  try {
    const details = await getUserDetails(id)
    return NextResponse.json(details)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch user'
    if (message.includes('No rows found') || message.includes('multiple (or no) rows')) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const parsed = parseBody(updateUserSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { role, display_name } = parsed.data

  try {
    if (role !== undefined) await updateUserRole(id, role)
    if (display_name !== undefined) await updateUserDisplayName(id, display_name)
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update user'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  // Prevent self-deletion
  if (id === admin.user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  try {
    await deleteUser(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete user'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
