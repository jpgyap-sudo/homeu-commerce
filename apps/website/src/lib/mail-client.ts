/**
 * Email Mail Client — Zoho IMAP sync engine using imapflow
 *
 * Connects to imap.zoho.com:993, syncs emails to local DB,
 * and provides search, categorize, and reply functionality.
 *
 * Sync modes:
 *   syncEmails(50)  → fetches latest 50 emails
 *   syncEmails(-1)  → backfill: fetches ALL emails from last 6 months
 *   syncEmails(200) → fetches latest 200
 */

import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { query } from '@/lib/db'

export interface EmailConfig {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
}

export interface SyncedEmail {
  messageId: string
  inReplyTo?: string
  subject?: string
  senderName?: string
  senderEmail?: string
  recipientEmail?: string
  bodyText?: string
  bodyHtml?: string
  attachments: any[]
  receivedAt: Date
}

let mailConfig: EmailConfig | null = null

export async function getMailConfig(): Promise<EmailConfig | null> {
  if (mailConfig) return mailConfig

  // Priority 1: New unified config (app_config_email, camelCase keys)
  try {
    const { loadNamespace } = await import('@/lib/app-config')
    const ec = await loadNamespace('email') as any
    const imapHost = ec?.imapHost || ec?.imap_host
    const user = ec?.salesEmail || ec?.sales_email || ec?.smtpUser || ec?.smtp_user
    const pass = ec?.salesEmailPass || ec?.sales_email_pass || ec?.smtpPass || ec?.smtp_pass
    if (imapHost && user && pass) {
      mailConfig = {
        host: imapHost,
        port: parseInt(ec?.imapPort || ec?.imap_port || '993'),
        secure: (ec?.imapSecure ?? ec?.imap_secure ?? 'true') !== 'false',
        user, pass,
      }
      return mailConfig
    }
  } catch { /* fall through */ }

  // Priority 2: Legacy smtp_config (set via old Email Settings page, snake_case keys)
  try {
    const result = await query(`SELECT data FROM "DaVinciOS_kv" WHERE key = 'smtp_config' LIMIT 1`)
    if (result.rows.length > 0) {
      const d = result.rows[0].data || {}
      const imapHost = d.imap_host || d.smtp_host
      const user = d.sales_email || d.smtp_user
      const pass = d.sales_email_pass || d.smtp_pass
      if (imapHost && user && pass) {
        mailConfig = {
          host: imapHost,
          port: parseInt(d.imap_port || d.smtp_port || '993'),
          secure: (d.imap_secure ?? 'true') !== 'false',
          user, pass,
        }
        return mailConfig
      }
    }
  } catch { /* fall through */ }

  // Priority 3: Env vars (legacy fallback)
  const host = process.env.ZOHO_IMAP_HOST || 'imap.zoho.com'
  const port = parseInt(process.env.ZOHO_IMAP_PORT || '993')
  const secure = process.env.ZOHO_IMAP_SECURE !== 'false'
  const user = process.env.SALES_EMAIL || ''
  const pass = process.env.SALES_EMAIL_PASS || ''
  if (!user || !pass) return null
  mailConfig = { host, port, secure, user, pass }
  return mailConfig
}

/**
 * Sync emails from IMAP into the emails table.
 *
 * @param limit - number of emails to sync.
 *   > 0 = fetch latest N emails (default 50)
 *   <= 0 = backfill all emails from last 6 months
 */
export async function syncEmails(limit = 50): Promise<{ synced: number; total: number; error?: string }> {
  const config = await getMailConfig()
  if (!config) return { synced: 0, total: 0, error: 'Email not configured. Set IMAP credentials in admin Settings.' }

  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    logger: false,
  })

  try {
    await client.connect()
    const lock = await client.getMailboxLock('INBOX')
    let synced = 0
    const maxSync = limit > 0 ? limit : 500

    try {
      // Determine fetch range
      if (limit > 0) {
        // Fetch latest N emails by sequence number
        const messages = client.fetch(`${1}:${limit}`, { uid: true, flags: true, source: true })
        for await (const msg of messages) {
          synced += await processMessage(msg, config) ? 1 : 0
        }
      } else {
        // Backfill: search for messages from last 6 months, then fetch those
        // matching UIDs. ImapFlow's fetch() has no `search` option — search
        // and fetch are separate calls.
        const sinceDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
        const uids = await client.search({ since: sinceDate }, { uid: true })
        if (uids && uids.length > 0) {
          const messages = client.fetch(uids, { uid: true, flags: true, source: true }, { uid: true })
          for await (const msg of messages) {
            if (synced >= maxSync) break
            synced += await processMessage(msg, config) ? 1 : 0
          }
        }
      }
    } finally {
      lock.release()
      await client.logout()
    }

    return { synced, total: synced }
  } catch (err: any) {
    return { synced: 0, total: 0, error: err.message }
  }
}

/** Get standard content-type icons */
function getFileIcon(mime: string): string {
  if (mime.startsWith('image/')) return '🖼️'
  if (mime === 'application/pdf') return '📄'
  if (mime.includes('word') || mime.includes('document')) return '📝'
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('sheet')) return '📊'
  if (mime.includes('presentation') || mime.includes('powerpoint')) return '📽️'
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar')) return '📦'
  return '📎'
}

/** Process a single IMAP message: parse, check duplicate, insert into DB + upload attachments. */
async function processMessage(msg: any, config: EmailConfig): Promise<boolean> {
  const source = msg.source?.toString() || ''
  if (!source) return false

  try {
    const parsed = await simpleParser(source)
    const messageId = (parsed as any).messageId || (parsed as any).message_id || msg.uid.toString()

    // Skip if already imported
    const exists = await query('SELECT id FROM emails WHERE message_id = $1', [messageId])
    if (exists.rows.length > 0) return false

    const fromAddr = (parsed as any)?.from?.value?.[0] || {}
    const toAddr = (parsed as any)?.to?.value?.[0] || {}
    const ccAddr = (parsed as any)?.cc?.text || null
    const inReplyTo = (parsed as any)?.inReplyTo?.messageId || null

    // Insert email first to get the ID
    const insertResult = await query(
      `INSERT INTO emails (message_id, in_reply_to, subject, sender_name, sender_email,
       recipient_email, cc, body_text, body_html, is_read, folder, received_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (message_id) DO NOTHING
       RETURNING id`,
      [
        messageId, inReplyTo,
        (parsed as any).subject || '(No Subject)',
        fromAddr.name || null, fromAddr.address || null,
        toAddr.address || config.user, ccAddr,
        (parsed as any).text || null, (parsed as any).html || null,
        (msg.flags as Set<string>)?.has?.('\\Seen') ? true : false,
        'INBOX', (parsed as any).date || new Date(),
      ]
    )

    const emailId = insertResult.rows[0]?.id
    if (!emailId) return false // already existed or insert failed

    // ── Store attachment metadata only (no upload during sync) ────
    // Actual upload to DO Spaces happens on-demand when admin clicks to view.
    const attachments = (parsed as any).attachments || []
    for (const att of attachments) {
      const filename = att.filename || `attachment-${Date.now()}`
      const contentType = att.contentType || 'application/octet-stream'
      const isInline = !!(att.related || att.cid)
      // Store buffer as base64 in DB temporarily, or just store metadata
      // Strategy: store metadata + content reference, lazy upload on view
      const bufferB64 = att.content ? att.content.toString('base64') : null

      await query(
        `INSERT INTO email_attachments
         (email_id, filename, content_type, size_bytes, data_base64, is_inline, cid)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING`,
        [emailId, filename, contentType, att.size || att.content?.length || 0, bufferB64, isInline, att.cid || null]
      )
    }

    return true
  } catch {
    return false
  }
}

/**
 * Auto-link emails to existing customers by email address match.
 */
export async function linkEmailsToCustomers() {
  try {
    const result = await query(
      `UPDATE emails e
       SET customer_id = c.id
       FROM customers c
       WHERE e.customer_id IS NULL
         AND LOWER(e.sender_email) = LOWER(c.email)`
    )
    return result.rowCount || 0
  } catch {
    return 0
  }
}

/**
 * Categorize an email based on subject and body content.
 */
export function categorizeEmail(subject: string, body: string): string {
  const text = `${subject || ''} ${body || ''}`.toLowerCase()

  if (/\brfq\b|\bquotation\b|\bquote\b|\bestimate\b|\bprice\b/i.test(text)) return 'rfq'
  if (/\bappointment\b|\bvisit\b|\bschedule\b|\bshowroom\b|\bmeet\b/i.test(text)) return 'appointment'
  if (/\border\b|\breturn\b|\brefund\b|\bcancel\b/i.test(text)) return 'order'
  if (/\bcomplaint\b|\bissue\b|\bproblem\b|\bbroken\b|\bdamage\b/i.test(text)) return 'support'
  if (/\bspam\b|\bunsubscribe\b/i.test(text)) return 'spam'

  return 'inquiry'
}
