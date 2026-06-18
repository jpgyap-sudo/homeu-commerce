/**
 * Email Mail Client — Zoho IMAP sync engine using imapflow
 *
 * Connects to imap.zoho.com:993, syncs emails to local DB,
 * and provides search, categorize, and reply functionality.
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

export function getMailConfig(): EmailConfig | null {
  if (mailConfig) return mailConfig
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
 * Sync latest N emails from Zoho IMAP into the emails table.
 * Skips already-imported message IDs.
 */
export async function syncEmails(limit = 50): Promise<{ synced: number; total: number; error?: string }> {
  const config = getMailConfig()
  if (!config) return { synced: 0, total: 0, error: 'Email not configured. Set SALES_EMAIL and SALES_EMAIL_PASS in .env' }

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

    try {
      // Fetch latest messages
      const messages = client.fetch(`${1}:${limit}`, { uid: true, flags: true, source: true })
      for await (const msg of messages) {
        const source = msg.source?.toString() || ''
        if (!source) continue

        const parsed = await simpleParser(source)
        const messageId = (parsed as any).messageId || (parsed as any).message_id || msg.uid.toString()

        // Skip if already imported
        const exists = await query('SELECT id FROM emails WHERE message_id = $1', [messageId])
        if (exists.rows.length > 0) continue

        const fromAddr = (parsed as any)?.from?.value?.[0] || {}
        const toAddr = (parsed as any)?.to?.value?.[0] || {}
        const ccAddr = (parsed as any)?.cc?.text || null
        const inReplyTo = (parsed as any)?.inReplyTo?.messageId || null

        await query(
          `INSERT INTO emails (message_id, in_reply_to, subject, sender_name, sender_email,
           recipient_email, cc, body_text, body_html, is_read, folder, received_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           ON CONFLICT (message_id) DO NOTHING`,
          [
            messageId,
            inReplyTo,
            (parsed as any).subject || '(No Subject)',
            fromAddr.name || null,
            fromAddr.address || null,
            toAddr.address || config.user,
            ccAddr,
            (parsed as any).text || null,
            (parsed as any).html || null,
            (msg.flags as Set<string>)?.has?.('\\Seen') ? true : false,
            'INBOX',
            (parsed as any).date || new Date(),
          ]
        )
        synced++
      }
    } finally {
      lock.release()
      await client.logout()
    }

    return { synced, total: synced === limit ? limit : synced }
  } catch (err: any) {
    return { synced: 0, total: 0, error: err.message }
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
