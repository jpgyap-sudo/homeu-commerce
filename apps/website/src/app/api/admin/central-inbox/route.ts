import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getUnifiedInbox, getConversationMessages } from '@/lib/central-inbox/service'
import type { InboxTab } from '@/lib/central-inbox/service'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const url = new URL(request.url)
    const tab = (url.searchParams.get('tab') || 'all') as InboxTab
    const search = url.searchParams.get('search') || ''
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200)
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0)
    const conversationId = url.searchParams.get('conversationId')
    const channel = url.searchParams.get('channel') || 'website'

    if (conversationId) {
      const messages = await getConversationMessages(conversationId, channel as any)
      return NextResponse.json({ messages })
    }

    const data = await getUnifiedInbox({ tab, search, limit, offset })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
