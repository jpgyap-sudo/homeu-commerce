const express = require('express')
const crypto = require('crypto')
const { query } = require('../db')
const logger = require('../lib/logger')
const { recalculateAll } = require('../services/scoring')

const router = express.Router()
const pixel = Buffer.from(
  'R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==',
  'base64'
)

function ipHash(req) {
  const ip =
    req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
  return crypto
    .createHash('sha256')
    .update(String(ip) + (process.env.IP_HASH_SALT || 'homeu'))
    .digest('hex')
}

// GET /open/:recipientId.gif — tracking pixel
router.get('/open/:recipientId.gif', async (req, res) => {
  try {
    const recipient = await query(
      'SELECT * FROM campaign_recipients WHERE id=$1',
      [req.params.recipientId]
    )
    if (recipient.rowCount) {
      const r = recipient.rows[0]
      await query(
        `INSERT INTO email_events (campaign_id, contact_id, recipient_id, event_type, user_agent, ip_hash)
         VALUES ($1,$2,$3,'open',$4,$5)`,
        [r.campaign_id, r.contact_id, r.id, req.header('user-agent'), ipHash(req)]
      )
      logger.info('Open tracked', { recipientId: req.params.recipientId, campaignId: r.campaign_id })
    }
  } catch (err) {
    logger.error('Open tracking failed', { recipientId: req.params.recipientId, error: err.message })
  }
  res.set('Content-Type', 'image/gif')
  res.set(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate'
  )
  res.end(pixel)
})

// GET /click/:recipientId — click tracking redirect
router.get('/click/:recipientId', async (req, res) => {
  try {
    const target = req.query.u
    if (!target || !/^https?:\/\//.test(target))
      return res.status(400).send('Invalid URL')

    const recipient = await query(
      'SELECT * FROM campaign_recipients WHERE id=$1',
      [req.params.recipientId]
    )
    if (recipient.rowCount) {
      const r = recipient.rows[0]
      await query(
        `INSERT INTO email_events (campaign_id, contact_id, recipient_id, event_type, url, user_agent, ip_hash)
         VALUES ($1,$2,$3,'click',$4,$5,$6)`,
        [
          r.campaign_id,
          r.contact_id,
          r.id,
          target,
          req.header('user-agent'),
          ipHash(req),
        ]
      )
      logger.info('Click tracked', { recipientId: req.params.recipientId, campaignId: r.campaign_id, url: target })
    }
    res.redirect(target)
  } catch (err) {
    logger.error('Click tracking failed', { recipientId: req.params.recipientId, error: err.message })
    res.redirect(req.query.u || '/')
  }
})

// GET /unsubscribe/:recipientId — one-click unsubscribe
router.get('/unsubscribe/:recipientId', async (req, res) => {
  try {
    const recipient = await query(
      'SELECT * FROM campaign_recipients WHERE id=$1',
      [req.params.recipientId]
    )
    if (!recipient.rowCount) return res.status(404).send('Not found')

    const r = recipient.rows[0]
    await query(
      `INSERT INTO suppression_list (email, reason) VALUES ($1, $2)
       ON CONFLICT(email) DO UPDATE SET reason = $2`,
      [r.email, 'unsubscribe']
    )
    await query(
      `INSERT INTO email_events (campaign_id, contact_id, recipient_id, event_type)
       VALUES ($1,$2,$3,'unsubscribe')`,
      [r.campaign_id, r.contact_id, r.id]
    )
    logger.info('Unsubscribe processed', { recipientId: req.params.recipientId, email: r.email, campaignId: r.campaign_id })

    // Recalculate lead score after unsubscribe
    await recalculateAll().catch(err =>
      logger.error('recalculateAll failed after unsubscribe', { error: err.message })
    )

    res.send(
      '<h1>Unsubscribed</h1><p>You will no longer receive marketing emails from HomeU.</p>'
    )
  } catch (err) {
    logger.error('Unsubscribe failed', { recipientId: req.params.recipientId, error: err.message })
    res.status(500).send('Unsubscribe failed')
  }
})

// POST /provider-webhook — bounce / complaint processing from email provider
router.post('/provider-webhook', async (req, res) => {
  try {
    const { event_type, recipient, recipient_id, campaign_id, contact_id, reason } = req.body

    if (!event_type || !['bounce', 'complaint'].includes(event_type)) {
      return res.status(400).json({ error: 'Invalid or missing event_type (must be bounce or complaint)' })
    }

    // Resolve recipient by email or recipient_id
    let resolvedRecipientId = recipient_id
    let resolvedContactId = contact_id
    let resolvedCampaignId = campaign_id
    const targetEmail = recipient || req.body.email

    if (!resolvedRecipientId && targetEmail) {
      const found = await query(
        'SELECT id, campaign_id, contact_id FROM campaign_recipients WHERE email = $1 ORDER BY created_at DESC LIMIT 1',
        [targetEmail]
      )
      if (found.rowCount) {
        resolvedRecipientId = found.rows[0].id
        resolvedCampaignId = resolvedCampaignId || found.rows[0].campaign_id
        resolvedContactId = resolvedContactId || found.rows[0].contact_id
      }
    }

    if (!resolvedRecipientId) {
      logger.warn('Provider webhook: could not resolve recipient', { event_type, recipient: targetEmail })
      return res.status(200).json({ ok: true, note: 'Recipient not found, acknowledged' })
    }

    // Insert email event
    await query(
      `INSERT INTO email_events (campaign_id, contact_id, recipient_id, event_type)
       VALUES ($1, $2, $3, $4)`,
      [resolvedCampaignId, resolvedContactId, resolvedRecipientId, event_type]
    )

    // Update campaign_recipients status
    const recipientStatus = event_type === 'bounce' ? 'bounced' : 'complained'
    await query(
      `UPDATE campaign_recipients SET status = $1 WHERE id = $2`,
      [recipientStatus, resolvedRecipientId]
    )

    // Insert into suppression_list
    if (targetEmail) {
      await query(
        `INSERT INTO suppression_list (email, reason) VALUES ($1, $2)
         ON CONFLICT(email) DO UPDATE SET reason = $2, updated_at = now()`,
        [targetEmail, event_type]
      )
    }

    logger.info(`Provider webhook: ${event_type} processed`, {
      recipientId: resolvedRecipientId,
      campaignId: resolvedCampaignId,
      contactId: resolvedContactId,
      email: targetEmail,
      reason: reason || null,
    })

    // Recalculate lead scores
    await recalculateAll().catch(err =>
      logger.error('recalculateAll failed after webhook', { error: err.message })
    )

    res.json({ ok: true, event_type, recipient_id: resolvedRecipientId })
  } catch (err) {
    logger.error('Provider webhook processing failed', { error: err.message })
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

module.exports = router
