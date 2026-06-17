/**
 * GET    /api/admin/articles/[id] — single article
 * PATCH  /api/admin/articles/[id] — update
 * DELETE /api/admin/articles/[id] — delete
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const res = await query('SELECT * FROM articles WHERE id = $1', [id])
    if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ article: res.rows[0] })
  } catch (err) {
    console.error('[api/admin/articles/[id]] GET error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const b = await request.json()

    const fields: string[] = []
    const vals: any[] = []
    let i = 0
    const set = (col: string, v: any, cast = '') => { i++; fields.push(`${col} = $${i}${cast}`); vals.push(v) }

    if (b.title !== undefined) set('title', b.title.trim())
    if (b.handle !== undefined) set('handle', b.handle.trim())
    if (b.body !== undefined) set('body', b.body || null)
    if (b.authorName !== undefined) set('author_name', b.authorName?.trim() || null)
    if (b.publishedAt !== undefined) set('published_at', b.publishedAt ? new Date(b.publishedAt) : null)
    if (b.imageUrl !== undefined) set('image_url', b.imageUrl?.trim() || null)
    if (b.imageAlt !== undefined) set('image_alt', b.imageAlt?.trim() || null)
    if (b.tags !== undefined) set('tags', JSON.stringify(Array.isArray(b.tags) ? b.tags : []), '::jsonb')
    if (b.blogId !== undefined) {
      set('blog_id', b.blogId)
      const blogRes = await query('SELECT handle FROM blogs WHERE id = $1', [b.blogId])
      if (blogRes.rows[0]) set('blog_handle', blogRes.rows[0].handle)
    }

    if (fields.length > 0) {
      i++
      await query(`UPDATE articles SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${i}`, [...vals, id])
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/admin/articles/[id]] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    await query('DELETE FROM articles WHERE id = $1', [id])
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/admin/articles/[id]] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
