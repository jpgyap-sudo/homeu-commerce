/**
 * GET  /api/rfq/[id]/attachments — list attachments on an RFQ (reference
 *      images, floor plans, project photos, or documents the client/admin
 *      uploaded). Auto-expire after 30 days (see expires_at) — the
 *      cleanup sweep removes both the DB row and the Spaces object.
 * POST /api/rfq/[id]/attachments — upload a new attachment.
 *      multipart/form-data, field "file". Accepts PDF, images
 *      (jpg/png/webp), Excel (xls/xlsx), and Word (doc/docx) only.
 *
 * Customer callers must own the RFQ (verified by email match, same
 * pattern as /api/rfq-chat); admin/staff sessions may access any RFQ.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { uploadBufferToSpaces } from '@/lib/do-spaces'
import { createHash } from 'crypto'

const MAX_SIZE_BYTES = 15 * 1024 * 1024 // 15MB

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}

async function resolveAccess(rfqId: number, session: { email: string; role: string } | null) {
  if (!session) return { ok: false as const, status: 401, error: 'Unauthorized' }
  if (session.role !== 'customer') return { ok: true as const, uploadedBy: 'admin' as const }

  const owns = await query(
    `SELECT 1 FROM rfq_requests r
     LEFT JOIN customers c ON c.id = r.customer_id
     WHERE r.id = $1 AND (LOWER(c.email) = LOWER($2) OR LOWER(r.email) = LOWER($2))
     LIMIT 1`,
    [rfqId, session.email]
  )
  if (owns.rowCount === 0) return { ok: false as const, status: 404, error: 'RFQ not found' }
  return { ok: true as const, uploadedBy: 'customer' as const }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  const { id } = await params
  const rfqId = parseInt(id, 10)
  if (!Number.isInteger(rfqId)) return NextResponse.json({ error: 'Invalid RFQ ID' }, { status: 400 })

  const access = await resolveAccess(rfqId, session)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  try {
    const result = await query(
      `SELECT id, url, filename, mime_type, size_bytes, uploaded_by, created_at, expires_at
       FROM rfq_attachments
       WHERE rfq_request_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [rfqId]
    )
    return NextResponse.json({ attachments: result.rows })
  } catch (err: any) {
    console.error('[api/rfq/:id/attachments] GET error:', err.message)
    return NextResponse.json({ error: 'Failed to load attachments' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  const { id } = await params
  const rfqId = parseInt(id, 10)
  if (!Number.isInteger(rfqId)) return NextResponse.json({ error: 'Invalid RFQ ID' }, { status: 400 })

  const access = await resolveAccess(rfqId, session)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const ext = ALLOWED_MIME_TYPES[file.type]
    if (!ext) {
      return NextResponse.json(
        { error: 'Only PDF, images (JPG/PNG/WEBP/GIF), Excel, and Word files are allowed' },
        { status: 400 }
      )
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'File must be 15MB or smaller' }, { status: 400 })
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16)
    const key = `rfq-attachments/${rfqId}/${Date.now()}-${hash}.${ext}`
    const url = await uploadBufferToSpaces(bytes, key, file.type)

    const inserted = await query(
      `INSERT INTO rfq_attachments (rfq_request_id, url, storage_key, filename, mime_type, size_bytes, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, url, filename, mime_type, size_bytes, uploaded_by, created_at, expires_at`,
      [rfqId, url, key, file.name, file.type, bytes.length, access.uploadedBy]
    )

    return NextResponse.json({ attachment: inserted.rows[0] }, { status: 201 })
  } catch (err: any) {
    console.error('[api/rfq/:id/attachments] POST error:', err.message)
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
