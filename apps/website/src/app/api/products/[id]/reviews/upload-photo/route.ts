/**
 * POST /api/products/[id]/reviews/upload-photo — upload a review photo
 * (customer side, no auth required). Uploads to DO Spaces and registers
 * in the media index. The caller passes the returned media_id to the
 * review submission endpoint.
 *
 * multipart/form-data: field "file". Returns { url, media_id }.
 */
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { uploadBufferToSpaces } from '@/lib/do-spaces'
import { createHash } from 'crypto'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP, and GIF images are accepted' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Image must be under 10 MB' }, { status: 400 })
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const sha256 = createHash('sha256').update(bytes).digest('hex')

    // Dedupe: identical bytes reuse the existing Spaces object + media row
    const existing = await query(`SELECT * FROM media WHERE sha256 = $1 LIMIT 1`, [sha256])
    if (existing.rows.length > 0) {
      return NextResponse.json({ url: existing.rows[0].url, media_id: existing.rows[0].id, deduped: true }, { status: 200 })
    }

    const key = `uploads/reviews/${sha256}.${ext}`
    const url = await uploadBufferToSpaces(bytes, key, file.type || 'application/octet-stream')

    const inserted = await query(
      `INSERT INTO media (url, filename, mime_type, filesize, sha256, source, kind, usage, used_count, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'review', 'image', '[]'::jsonb, 0, NOW(), NOW())
       RETURNING id, url`,
      [url, file.name, file.type || null, bytes.length, sha256]
    )

    return NextResponse.json({ url, media_id: inserted.rows[0].id, deduped: false }, { status: 201 })
  } catch (err: any) {
    console.error('[products/:id/reviews/upload-photo] POST error:', err)
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
