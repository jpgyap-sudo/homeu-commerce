import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { rows } = await query('SELECT * FROM instagram_posts ORDER BY sort_order, created_at DESC')
    return NextResponse.json({ posts: rows })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { image_url, caption, link, alt_text, width, height, products, hotspots, tags, sort_order } = body
    const { rows } = await query(
      `INSERT INTO instagram_posts (image_url, caption, link, alt_text, width, height, products, hotspots, tags, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [image_url, caption, link, alt_text, width || 800, height || 800, JSON.stringify(products || []), JSON.stringify(hotspots || []), tags || [], sort_order || 0]
    )
    return NextResponse.json({ post: rows[0] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
