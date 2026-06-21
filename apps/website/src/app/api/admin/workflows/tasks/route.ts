import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createTask, updateTaskStatus } from '@/lib/workflows'
import { revalidateTag } from 'next/cache'

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { taskId, status } = body

    if (!taskId || !status) {
      return NextResponse.json({ error: 'taskId and status are required' }, { status: 400 })
    }

    const validStatuses = ['pending', 'in_progress', 'completed', 'blocked', 'skipped']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 })
    }

    const success = await updateTaskStatus(taskId, status, session.name || session.email)
    if (!success) {
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    }

    // Invalidate workflows cache so the updated status reflects immediately
    revalidateTag('admin-workflows', 'default')

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const featureSlug = String(body.featureSlug || '').trim()
    const title = String(body.title || '').trim()
    if (!featureSlug || !title) {
      return NextResponse.json({ error: 'featureSlug and title are required' }, { status: 400 })
    }
    const priority = ['critical', 'high', 'medium', 'low'].includes(body.priority) ? body.priority : 'medium'
    const id = await createTask({
      featureSlug,
      title: title.slice(0, 200),
      description: String(body.description || '').trim().slice(0, 1000),
      priority,
      assignee: session.name || session.email,
    })
    if (!id) return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    revalidateTag('admin-workflows', 'default')
    const now = new Date().toISOString()
    return NextResponse.json({
      id, title, description: body.description || null, status: 'pending', priority,
      assignee: session.name || session.email, dueDate: null, metadata: {}, sortOrder: 0,
      isAutomated: false, completedAt: null, createdAt: now, updatedAt: now,
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
