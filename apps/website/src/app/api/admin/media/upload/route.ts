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
import { uploadToSpaces, spacesConfigured } from '@/lib/spaces'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!spacesConfigured()) {
      return NextResponse.json({ error: 'DO Spaces is not configured on the server (DO_SPACES_* env vars).' }, { status: 500 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const buf = Buffer.from(await file.arrayBuffer())
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const contentType = file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`

    // → DigitalOcean Spaces (deduped by content hash)
    const up = await uploadToSpaces(buf, ext, contentType)

    // Register / update the media index row. On conflict keep the existing
    // source/usage (don't downgrade a product image to "upload").
    const res = await query(
      `INSERT INTO media (url, filename, mime_type, filesize, sha256, source, kind, usage, used_count, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'upload', 'image', '[]'::jsonb, 0, NOW(), NOW())
       ON CONFLICT (sha256) WHERE sha256 IS NOT NULL DO UPDATE SET
         filename = COALESCE(media.filename, EXCLUDED.filename),
         mime_type = COALESCE(media.mime_type, EXCLUDED.mime_type),
         filesize = COALESCE(media.filesize, EXCLUDED.filesize),
         updated_at = NOW()
       RETURNING id, url, filename, source, sha256`,
      [up.url, file.name, contentType, up.bytes, up.sha256]
    )

    return NextResponse.json({ url: up.url, deduped: up.deduped, media: res.rows[0] }, { status: 201 })
  } catch (err) {
    console.error('[api/admin/media/upload] POST error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
