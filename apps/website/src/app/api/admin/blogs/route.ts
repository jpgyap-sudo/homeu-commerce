/**
 * GET  /api/admin/blogs — list blog containers
 * POST /api/admin/blogs — create a blog container { title, handle? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

function slugify(s: string): string {
  return (s || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'blog'
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const res = await query(
      `SELECT b.id, b.title, b.handle,
              (SELECT COUNT(*) FROM articles a WHERE a.blog_id = b.id) AS article_count
       FROM blogs b ORDER BY b.title ASC`, []
    )
    return NextResponse.json({ blogs: res.rows })
  } catch (err) {
    console.error('[api/admin/blogs] GET error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const b = await request.json()
    if (!b.title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })
    let base = b.handle?.trim() || slugify(b.title)
    let handle = base, n = 1
    while (true) {
      const ex = await query('SELECT id FROM blogs WHERE handle = $1', [handle])
      if (ex.rows.length === 0) break
      handle = `${base}-${n++}`
    }
    const res = await query(
      `INSERT INTO blogs (title, handle, created_at) VALUES ($1, $2, NOW()) RETURNING id`,
      [b.title.trim(), handle]
    )
    return NextResponse.json({ id: res.rows[0].id, handle }, { status: 201 })
  } catch (err) {
    console.error('[api/admin/blogs] POST error:', err)
    return NextResponse.json({ error: 'Failed to create blog' }, { status: 500 })
  }
}
