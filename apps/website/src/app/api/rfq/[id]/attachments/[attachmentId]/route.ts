/**
 * DELETE /api/rfq/[id]/attachments/[attachmentId] — remove an attachment
 * (the uploader or staff only). Deletes the Spaces object and soft-deletes
 * the DB row.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { deleteObjectFromSpaces } from '@/lib/do-spaces'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, attachmentId } = await params
  const rfqId = parseInt(id, 10)

  try {
    const rowRes = await query(
      `SELECT a.id, a.storage_key, a.uploaded_by
       FROM rfq_attachments a
       JOIN rfq_requests r ON r.id = a.rfq_request_id
       LEFT JOIN customers c ON c.id = r.customer_id
       WHERE a.id = $1 AND a.rfq_request_id = $2 AND a.deleted_at IS NULL
         AND ($3 OR LOWER(c.email) = LOWER($4) OR LOWER(r.email) = LOWER($4))
       LIMIT 1`,
      [attachmentId, rfqId, session.role !== 'customer', session.email]
    )
    if (rowRes.rowCount === 0) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }
    if (session.role === 'customer' && rowRes.rows[0].uploaded_by !== 'customer') {
      return NextResponse.json({ error: 'Only the HomeU team can remove this file' }, { status: 403 })
    }

    await deleteObjectFromSpaces(rowRes.rows[0].storage_key).catch(() => { /* best-effort */ })
    await query(`UPDATE rfq_attachments SET deleted_at = NOW() WHERE id = $1`, [attachmentId])

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[api/rfq/:id/attachments/:attachmentId] DELETE error:', err.message)
    return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 })
  }
}
