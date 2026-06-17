import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

/**
 * POST /api/analytics/pageview — record a page view.
 *
 * Called from the client-side PageViewTracker component.
 * Body: { path: string, title?: string, referrer?: string, visitorId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { path, title, referrer, visitorId } = body

    if (!path) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 })
    }

    // Truncate fields to prevent abuse
    const safePath = String(path).slice(0, 500)
    const safeTitle = title ? String(title).slice(0, 300) : null
    const safeReferrer = referrer ? String(referrer).slice(0, 1000) : null
    const safeVisitor = visitorId ? String(visitorId).slice(0, 100) : null

    await query(
      `INSERT INTO page_views (path, title, referrer, visitor_id, is_admin)
       VALUES ($1, $2, $3, $4, $5)`,
      [safePath, safeTitle, safeReferrer, safeVisitor, safePath.startsWith('/admin')]
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[pageview] Error recording:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
