/**
 * GET  /api/admin/articles  — list articles (admin)
 * POST /api/admin/articles  — create an article
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

function slugify(s: string): string {
  return (s || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'untitled'
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const blogId = searchParams.get('blogId')
    const search = (searchParams.get('search') || '').trim()

    const conds: string[] = []
    const vals: any[] = []
    let i = 0
    if (blogId) { i++; conds.push(`a.blog_id = $${i}`); vals.push(blogId) }
    if (search) { i++; conds.push(`a.title ILIKE $${i}`); vals.push(`%${search}%`) }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''

    const res = await query(
      `SELECT a.id, a.title, a.handle, a.blog_id, a.blog_handle, a.author_name,
              a.published_at, a.image_url, a.updated_at,
              b.title AS blog_title
       FROM articles a LEFT JOIN blogs b ON b.id = a.blog_id
       ${where}
       ORDER BY a.published_at DESC NULLS LAST, a.id DESC`,
      vals
    )
    return NextResponse.json({ articles: res.rows })
  } catch (err) {
    console.error('[api/admin/articles] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const b = await request.json()
    if (!b.title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    if (!b.blogId) return NextResponse.json({ error: 'Blog is required' }, { status: 400 })

    const blogRes = await query('SELECT handle FROM blogs WHERE id = $1', [b.blogId])
    if (blogRes.rows.length === 0) return NextResponse.json({ error: 'Blog not found' }, { status: 400 })
    const blogHandle = blogRes.rows[0].handle

    let base = b.handle?.trim() || slugify(b.title)
    let handle = base
    let n = 1
    while (true) {
      const ex = await query('SELECT id FROM articles WHERE blog_id = $1 AND handle = $2', [b.blogId, handle])
      if (ex.rows.length === 0) break
      handle = `${base}-${n++}`
    }

    const res = await query(
      `INSERT INTO articles (blog_id, blog_handle, title, handle, body, author_name, published_at, image_url, image_alt, tags, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,NOW(),NOW()) RETURNING id`,
      [
        b.blogId, blogHandle, b.title.trim(), handle, b.body || null,
        b.authorName?.trim() || null,
        b.publishedAt ? new Date(b.publishedAt) : new Date(),
        b.imageUrl?.trim() || null, b.imageAlt?.trim() || null,
        JSON.stringify(Array.isArray(b.tags) ? b.tags : []),
      ]
    )
    return NextResponse.json({ id: res.rows[0].id, handle }, { status: 201 })
  } catch (err) {
    console.error('[api/admin/articles] POST error:', err)
    return NextResponse.json({ error: 'Failed to create article' }, { status: 500 })
  }
}
