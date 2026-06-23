/**
 * POST /api/admin/media/upload — upload an image straight to DigitalOcean
 * Spaces (content-addressed) and register it in the `media` index.
 *
 * multipart/form-data: field "file". Returns { url, deduped, media }.
 *
 * Dedupes by SHA-256: re-uploading identical bytes reuses the existing object
 * and media row (and preserves its existing source/usage categorization).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { uploadBufferToSpaces } from '@/lib/do-spaces'
import { createHash } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const source = formData.get('source') as string || 'upload'
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const bytes = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const sha256 = createHash('sha256').update(bytes).digest('hex')

    // Dedupe: identical bytes reuse the existing Spaces object + media row.
    const existing = await query(`SELECT * FROM media WHERE sha256 = $1 LIMIT 1`, [sha256])
    if (existing.rows.length > 0) {
      // If we re-uploaded it and selected a custom category, let's update source if it was 'upload'
      if (existing.rows[0].source === 'upload' && source !== 'upload') {
        const updated = await query(`UPDATE media SET source = $1, updated_at = NOW() WHERE id = $2 RETURNING *`, [source, existing.rows[0].id])
        return NextResponse.json({ url: existing.rows[0].url, deduped: true, media: updated.rows[0] }, { status: 200 })
      }
      return NextResponse.json({ url: existing.rows[0].url, deduped: true, media: existing.rows[0] }, { status: 200 })
    }

    const key = `uploads/${sha256}.${ext}`
    const url = await uploadBufferToSpaces(bytes, key, file.type || 'application/octet-stream')

    const inserted = await query(
      `INSERT INTO media (url, filename, mime_type, filesize, sha256, source, kind, usage, used_count, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'image', '[]'::jsonb, 0, NOW(), NOW())
       RETURNING *`,
      [url, file.name, file.type || null, bytes.length, sha256, source]
    )

    return NextResponse.json({ url, deduped: false, media: inserted.rows[0] }, { status: 201 })
  } catch (err: any) {
    console.error('[api/admin/media/upload] POST error:', err)
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
