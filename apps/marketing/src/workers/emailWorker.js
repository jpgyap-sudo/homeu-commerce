const { Worker } = require('bullmq')
const { connection } = require('../lib/queue')
const { query } = require('../db')
const { renderTemplate } = require('../services/renderTemplate')
const { sendEmail } = require('../services/sendProvider')
const logger = require('../lib/logger')

const rate = Number(process.env.SEND_RATE_PER_MINUTE || 60)
const limiter = { max: rate, duration: 60_000 }

const worker = new Worker(
  'campaign-email-send',
  async (job) => {
    const { recipientId } = job.data
    logger.info('Email job processing', { jobId: job.id, recipientId })

    // Fetch full recipient+campaign+template data, excluding suppressed contacts
    const result = await query(
      `SELECT
         r.id AS recipient_id, r.email, r.status AS recipient_status,
         c.id AS contact_id, c.first_name, c.last_name, c.company, c.role, c.tags,
         ca.id AS campaign_id, ca.subject AS campaign_subject, ca.status AS campaign_status,
         t.html_body, t.text_body, t.subject AS template_subject
       FROM campaign_recipients r
       JOIN contacts c ON c.id = r.contact_id
       JOIN campaigns ca ON ca.id = r.campaign_id
       JOIN email_templates t ON t.id = ca.template_id
       LEFT JOIN suppression_list s ON LOWER(s.email) = LOWER(r.email)
       WHERE r.id = $1 AND s.email IS NULL`,
      [recipientId]
    )

    if (!result.rowCount) return { skipped: true, reason: 'not found or suppressed' }

    const row = result.rows[0]
    if (row.campaign_status !== 'sending') {
      return { skipped: true, reason: 'campaign not in sending status' }
    }

    // Mark as sending
    await query("UPDATE campaign_recipients SET status = 'sending' WHERE id = $1", [recipientId])

    const base = process.env.TRACKING_DOMAIN || process.env.PUBLIC_APP_URL || 'http://localhost:4010'

    const tracking = {
      trackingPixelUrl: `${base}/t/open/${recipientId}.gif`,
      unsubscribeUrl: `${base}/t/unsubscribe/${recipientId}`,
      contactCardUrl: process.env.CONTACT_CARD_URL || `${base}/contact-card/homeu.vcf`,
    }

    // Rewrite links for click tracking
    const htmlWithTrackedLinks = rewriteLinks(
      row.html_body,
      `${base}/t/click/${recipientId}`
    )

    const rendered = renderTemplate(
      {
        html: htmlWithTrackedLinks,
        text: row.text_body,
        subject: row.campaign_subject || row.template_subject,
      },
      row,
      tracking
    )

    try {
      const sent = await sendEmail({
        to: row.email,
        ...rendered,
      })

      await query(
        `UPDATE campaign_recipients
         SET status = 'sent', provider_message_id = $1, sent_at = now()
         WHERE id = $2`,
        [sent.messageId, recipientId]
      )

      await query(
        `INSERT INTO email_events (campaign_id, contact_id, recipient_id, event_type)
         VALUES ($1, $2, $3, 'delivered')`,
        [row.campaign_id, row.contact_id, recipientId]
      )

      logger.info('Email sent successfully', { jobId: job.id, recipientId, messageId: sent.messageId })
      return { sent: true, messageId: sent.messageId }
    } catch (error) {
      await query(
        "UPDATE campaign_recipients SET status = 'failed', error = $1 WHERE id = $2",
        [error.message, recipientId]
      )
      logger.error('Email send failed', { jobId: job.id, recipientId, error: error.message })
      throw error // BullMQ will retry based on job options
    }
  },
  { connection, limiter }
)

/**
 * Rewrite absolute http(s) links to go through click-tracking proxy.
 */
function rewriteLinks(html, clickBase) {
  return html.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (_, url) => `href="${clickBase}?u=${encodeURIComponent(url)}"`
  )
}

worker.on('completed', (job) => logger.info('Email job completed', { jobId: job.id }))
worker.on('failed', (job, err) =>
  logger.error('Email job failed', { jobId: job?.id, error: err.message })
)

logger.info('EmailWorker started', { rateLimit: `${rate}/min` })

module.exports = worker
