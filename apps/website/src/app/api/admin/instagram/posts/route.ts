import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { rows } = await query('SELECT * FROM instagram_posts ORDER BY is_pinned DESC, sort_order, created_at DESC')
    return NextResponse.json({ posts: rows })
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const { image_url, caption, link, alt_text, width, height, products, hotspots, tags, sort_order, source, permalink, collection_ids, status } = body
    const { rows } = await query(
      `INSERT INTO instagram_posts (image_url, caption, link, alt_text, width, height, products, hotspots, tags, sort_order, source, permalink, collection_ids, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [image_url, caption, link, alt_text, width||800, height||800, JSON.stringify(products||[]), JSON.stringify(hotspots||[]), tags||[], sort_order||0, source||'manual_upload', permalink, collection_ids||[], status||'approved']
    )
    return NextResponse.json({ post: rows[0] })
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const { id, is_pinned, is_visible, status, sort_order, products, hotspots, caption, alt_text } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const sets: string[] = []; const vals: any[] = []; let i = 1
    if (is_pinned !== undefined) { sets.push(`is_pinned=$${i++}`); vals.push(is_pinned) }
    if (is_visible !== undefined) { sets.push(`is_visible=$${i++}`); vals.push(is_visible) }
    if (status) { sets.push(`status=$${i++}`); vals.push(status) }
    if (sort_order !== undefined) { sets.push(`sort_order=$${i++}`); vals.push(sort_order) }
    if (products) { sets.push(`products=$${i++}`); vals.push(JSON.stringify(products)) }
    if (hotspots) { sets.push(`hotspots=$${i++}`); vals.push(JSON.stringify(hotspots)) }
    if (caption !== undefined) { sets.push(`caption=$${i++}`); vals.push(caption) }
    if (alt_text !== undefined) { sets.push(`alt_text=$${i++}`); vals.push(alt_text) }
    if (sets.length === 0) return NextResponse.json({ error: 'no fields to update' }, { status: 400 })

    vals.push(id)
    const { rows } = await query(`UPDATE instagram_posts SET ${sets.join(', ')} WHERE id=$${i} RETURNING *`, vals)
    return NextResponse.json({ post: rows[0] })
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await query('DELETE FROM instagram_posts WHERE id=$1', [id])
    await query('UPDATE grid_cells SET post_id=NULL WHERE post_id=$1', [id])
    return NextResponse.json({ success: true })
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) }
}
