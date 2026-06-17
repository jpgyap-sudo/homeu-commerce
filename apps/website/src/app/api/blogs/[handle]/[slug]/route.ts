import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ handle: string; slug: string }> }
) {
  try {
    const { handle, slug } = await params

    const result = await query(
      `SELECT a.*, b.title as blog_title, b.handle as blog_handle
       FROM articles a
       JOIN blogs b ON b.id = a.blog_id
       WHERE b.handle = $1 AND a.handle = $2
       LIMIT 1`,
      [handle, slug]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (err) {
    console.error('[api/blogs/:handle/:slug] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 })
  }
}
