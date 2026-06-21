/**
 * GET /api/admin/email/attachments?emailId=N — list attachments for an email.
 * GET /api/admin/email/attachments?id=N&download=1 — download/stream an attachment.
 *
 * On first download, the attachment buffer is uploaded to DO Spaces and future
 * requests serve from the CDN URL. This avoids uploading during IMAP sync.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { uploadBufferToSpaces } from '@/lib/do-spaces'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const emailId = searchParams.get('emailId')
    const attId = searchParams.get('id')
    const download = searchParams.get('download') === '1'

    // List attachments for an email
    if (emailId) {
      const result = await query(
        `SELECT id, filename, content_type, size_bytes, cdn_url, is_inline, cid
         FROM email_attachments WHERE email_id = $1 ORDER BY is_inline, id`,
        [parseInt(emailId)]
      )
      return NextResponse.json({ attachments: result.rows })
    }

    // Download/view a specific attachment
    if (attId) {
      const result = await query(
        `SELECT * FROM email_attachments WHERE id = $1 LIMIT 1`,
        [parseInt(attId)]
      )
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
      }

      const att = result.rows[0]

      // If already uploaded to DO Spaces, redirect to CDN
      if (att.cdn_url) {
        return NextResponse.redirect(att.cdn_url)
      }

      // First view: upload to DO Spaces, then redirect
      if (att.data_base64) {
        const buffer = Buffer.from(att.data_base64, 'base64')
        const key = `email-attachments/${att.email_id}/${Date.now()}-${att.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`

        try {
          const cdnUrl = await uploadBufferToSpaces(buffer, key, att.content_type || 'application/octet-stream')

          // Save CDN URL and clear base64 data
          await query(
            `UPDATE email_attachments SET spaces_key = $1, cdn_url = $2, data_base64 = NULL WHERE id = $3`,
            [key, cdnUrl, att.id]
          )

          return NextResponse.redirect(cdnUrl)
        } catch {
          // If upload fails, serve base64 inline as fallback
          const dataUri = `data:${att.content_type || 'application/octet-stream'};base64,${att.data_base64}`
          return NextResponse.redirect(dataUri)
        }
      }

      return NextResponse.json({ error: 'No attachment data available' }, { status: 404 })
    }

    return NextResponse.json({ error: 'emailId or id query param required' }, { status: 400 })
  } catch (err: any) {
    console.error('[admin/email/attachments] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
