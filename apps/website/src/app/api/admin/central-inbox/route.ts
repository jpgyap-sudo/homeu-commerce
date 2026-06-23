import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getUnifiedInbox, getConversationMessages, updateConversationStatus, getUnreadCounts } from '@/lib/central-inbox/service'
import type { InboxTab } from '@/lib/central-inbox/service'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const url = new URL(request.url)
    const tab = (url.searchParams.get('tab') || 'all') as InboxTab
    const search = url.searchParams.get('search') || ''
    const statusFilter = (url.searchParams.get('statusFilter') || 'all') as any
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200)
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0)
    const conversationId = url.searchParams.get('conversationId')
    const channel = url.searchParams.get('channel') || 'website'

    if (conversationId) {
      const messages = await getConversationMessages(conversationId, channel as any)
      return NextResponse.json({ messages })
    }

    const data = await getUnifiedInbox({ tab, search, limit, offset, statusFilter })
    const unreadCounts = await getUnreadCounts()
    return NextResponse.json({ ...data, unreadCounts })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { conversationId, channel, action } = body

    if (!conversationId || !channel || !action) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const success = await updateConversationStatus(conversationId, channel, action)
    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Failed to update conversation status' }, { status: 500 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
