/**
 * GET /api/admin/media — list media from the library index.
 * Used by the Theme Editor's MediaPicker "Browse" tab.
 *
 * Query params: ?q=<filename search> &source=<product|article|theme|brand|upload>
 * Returns { urls: string[], media: { url, filename, source, used_count }[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const source = (searchParams.get('source') || '').trim()

    const conds: string[] = ['url IS NOT NULL']
    const vals: any[] = []
    let i = 0
    if (q) { i++; conds.push(`LOWER(COALESCE(filename,'')) LIKE LOWER($${i})`); vals.push(`%${q}%`) }
    if (source) { i++; conds.push(`source = $${i}`); vals.push(source) }

    const res = await query(
      `SELECT url, filename, source, used_count
       FROM media WHERE ${conds.join(' AND ')}
       ORDER BY used_count DESC NULLS LAST, created_at DESC
       LIMIT 300`,
      vals
    )

    return NextResponse.json({
      urls: res.rows.map((r: any) => r.url),
      media: res.rows,
    })
  } catch (err) {
    console.error('[api/admin/media] GET error:', err)
    return NextResponse.json({ urls: [], media: [] })
  }
}
