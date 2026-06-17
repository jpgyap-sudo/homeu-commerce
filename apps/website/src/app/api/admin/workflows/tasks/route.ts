import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { updateTaskStatus } from '@/lib/workflows'
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
