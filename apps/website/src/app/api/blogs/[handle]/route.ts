import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params

    const blogRes = await query(
      `SELECT id, handle, title, created_at FROM blogs WHERE handle = $1`,
      [handle]
    )
    if (blogRes.rows.length === 0) {
      return NextResponse.json({ error: 'Blog not found' }, { status: 404 })
    }
    const blog = blogRes.rows[0]

    const articlesRes = await query(
      `SELECT id, handle, title, author_name, published_at, image_url, image_alt, tags
       FROM articles
       WHERE blog_id = $1
       ORDER BY published_at DESC NULLS LAST`,
      [blog.id]
    )

    return NextResponse.json({ ...blog, articles: articlesRes.rows })
  } catch (err) {
    console.error('[api/blogs/:handle] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch blog' }, { status: 500 })
  }
}
