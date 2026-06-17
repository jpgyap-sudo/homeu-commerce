import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const result = await query(
      `SELECT b.id, b.handle, b.title, b.created_at,
              COUNT(a.id)::int as article_count,
              MAX(a.published_at) as last_published
       FROM blogs b
       LEFT JOIN articles a ON a.blog_id = b.id
       GROUP BY b.id
       ORDER BY b.id ASC`,
      []
    )
    return NextResponse.json({ docs: result.rows })
  } catch (err) {
    console.error('[api/blogs] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch blogs' }, { status: 500 })
  }
}
