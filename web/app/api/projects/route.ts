import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/services/auth'
import { isPremiumUser } from '@/lib/services/billing'
import { getUserProjects, countUserProjects, createProject, reorderProjects } from '@/lib/repositories/projects'
import { createProjectSchema, reorderSchema, parseBody } from '@/lib/validation'

const FREE_PROJECT_LIMIT = 5

export async function GET() {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projects = await getUserProjects(user.id)
  return NextResponse.json(projects)
}

export async function POST(request: NextRequest) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = parseBody(createProjectSchema, body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  // Enforce project limit for free users
  const premium = await isPremiumUser(user.id)
  if (!premium) {
    const count = await countUserProjects(user.id)
    if (count >= FREE_PROJECT_LIMIT) {
      return NextResponse.json(
        { error: `Free plan is limited to ${FREE_PROJECT_LIMIT} projects. Upgrade to Premium for unlimited projects.` },
        { status: 403 },
      )
    }
  }

  const { error } = await createProject(user.id, parsed.data)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, id: parsed.data.id }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const action = request.nextUrl.searchParams.get('action')
  if (action === 'reorder') {
    const body = await request.json()
    const parsed = parseBody(reorderSchema, body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const { error } = await reorderProjects(user.id, parsed.data.ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
