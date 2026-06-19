const express = require('express')
const { z } = require('zod')
const { query } = require('../db')
const { emailQueue } = require('../lib/queue')
const { getContactsForSegment } = require('../services/segmentService')
const logger = require('../lib/logger')

const router = express.Router()

// --- Zod schemas ---
const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

const createCampaignSchema = z.object({
  name: z.string().min(1, 'name is required'),
  subject: z.string().min(1, 'subject is required'),
  template_id: z.coerce.number().int().positive().optional().nullable(),
  segment_id: z.coerce.number().int().positive().optional().nullable(),
  scheduled_at: z.string().datetime().optional().nullable(),
})

const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  template_id: z.coerce.number().int().positive().optional().nullable(),
  segment_id: z.coerce.number().int().positive().optional().nullable(),
  scheduled_at: z.string().datetime().optional().nullable(),
  status: z.string().optional(),
})

// GET / — list campaigns with joined segment/template names and stats
router.get('/', async (_req, res) => {
  try {
    const result = await query(`
      SELECT
        c.*,
        s.name AS segment_name,
        t.name AS template_name,
        COUNT(r.id)::int AS recipients,
        COUNT(r.id) FILTER (WHERE r.status = 'sent')::int AS sent_count
      FROM campaigns c
      LEFT JOIN segments s ON s.id = c.segment_id
      LEFT JOIN email_templates t ON t.id = c.template_id
      LEFT JOIN campaign_recipients r ON r.campaign_id = c.id
      GROUP BY c.id, s.name, t.name
      ORDER BY c.created_at DESC
    `)
    res.json({ campaigns: result.rows })
  } catch (err) {
    logger.error('Failed to list campaigns', { error: err.message })
    res.status(500).json({ error: 'Failed to list campaigns' })
  }
})

// GET /:id — single campaign with analytics
router.get('/:id', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const campaign = await query('SELECT * FROM campaigns WHERE id = $1', [id])
    if (campaign.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' })
    res.json(campaign.rows[0])
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid campaign ID', details: err.errors })
    }
    logger.error('Failed to get campaign', { campaignId: req.params.id, error: err.message })
    res.status(500).json({ error: 'Failed to get campaign' })
  }
})

// POST / — create campaign
router.post('/', async (req, res) => {
  try {
    const data = createCampaignSchema.parse(req.body)
    const result = await query(
      'INSERT INTO campaigns (name, subject, template_id, segment_id, scheduled_at) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [data.name, data.subject, data.template_id || null, data.segment_id || null, data.scheduled_at || null]
    )
    logger.info('Campaign created', { campaignId: result.rows[0].id, name: data.name })
    res.status(201).json(result.rows[0])
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    logger.error('Failed to create campaign', { error: err.message })
    res.status(500).json({ error: 'Failed to create campaign' })
  }
})

// PUT /:id — update campaign
router.put('/:id', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const data = updateCampaignSchema.parse(req.body)
    const result = await query(
      `UPDATE campaigns
       SET name = COALESCE($1, name),
           subject = COALESCE($2, subject),
           template_id = COALESCE($3, template_id),
           segment_id = COALESCE($4, segment_id),
           scheduled_at = COALESCE($5, scheduled_at),
           status = COALESCE($6, status),
           updated_at = now()
       WHERE id = $7 RETURNING *`,
      [data.name, data.subject, data.template_id, data.segment_id, data.scheduled_at, data.status, id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' })
    logger.info('Campaign updated', { campaignId: id })
    res.json(result.rows[0])
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    logger.error('Failed to update campaign', { campaignId: req.params.id, error: err.message })
    res.status(500).json({ error: 'Failed to update campaign' })
  }
})

// DELETE /:id — delete campaign (cascades to recipients and events)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const result = await query('DELETE FROM campaigns WHERE id = $1 RETURNING *', [id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' })
    logger.info('Campaign deleted', { campaignId: id })
    res.json({ ok: true, deleted: result.rows[0].id })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid campaign ID', details: err.errors })
    }
    logger.error('Failed to delete campaign', { campaignId: req.params.id, error: err.message })
    res.status(500).json({ error: 'Failed to delete campaign' })
  }
})

// POST /:id/prepare — evaluate segment and insert recipients
router.post('/:id/prepare', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const campaign = await query('SELECT * FROM campaigns WHERE id = $1', [id])
    if (campaign.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' })

    const contacts = await getContactsForSegment(campaign.rows[0].segment_id)
    let inserted = 0
    for (const contact of contacts) {
      const result = await query(
        `INSERT INTO campaign_recipients (campaign_id, contact_id, email)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING id`,
        [id, contact.id, contact.email]
      )
      inserted += result.rowCount
    }
    logger.info('Campaign prepared', { campaignId: id, inserted, totalEligible: contacts.length })
    res.json({ prepared: inserted, totalEligible: contacts.length })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid campaign ID', details: err.errors })
    }
    logger.error('Failed to prepare campaign', { campaignId: req.params.id, error: err.message })
    res.status(500).json({ error: 'Failed to prepare campaign' })
  }
})

// POST /:id/send — queue all pending recipients to BullMQ
router.post('/:id/send', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params)

    await query("UPDATE campaigns SET status = 'sending', updated_at = now() WHERE id = $1", [id])

    const recipients = await query(
      "SELECT id FROM campaign_recipients WHERE campaign_id = $1 AND status = 'queued'",
      [id]
    )

    for (const r of recipients.rows) {
      await emailQueue.add(
        'send-recipient',
        { recipientId: r.id },
        { attempts: 3, backoff: { type: 'exponential', delay: 30000 } }
      )
    }

    logger.info('Campaign send queued', { campaignId: id, queued: recipients.rowCount })
    res.json({ queued: recipients.rowCount })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid campaign ID', details: err.errors })
    }
    logger.error('Failed to send campaign', { campaignId: req.params.id, error: err.message })
    res.status(500).json({ error: 'Failed to send campaign' })
  }
})

// POST /:id/pause — pause sending
router.post('/:id/pause', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const result = await query(
      "UPDATE campaigns SET status = 'paused', updated_at = now() WHERE id = $1 RETURNING *",
      [id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' })
    logger.info('Campaign paused', { campaignId: id })
    res.json(result.rows[0])
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid campaign ID', details: err.errors })
    }
    logger.error('Failed to pause campaign', { campaignId: req.params.id, error: err.message })
    res.status(500).json({ error: 'Failed to pause campaign' })
  }
})

// GET /:id/analytics — aggregated event + recipient stats
router.get('/:id/analytics', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const events = await query(
      'SELECT event_type, COUNT(*)::int AS count FROM email_events WHERE campaign_id = $1 GROUP BY event_type',
      [id]
    )
    const recipients = await query(
      'SELECT status, COUNT(*)::int AS count FROM campaign_recipients WHERE campaign_id = $1 GROUP BY status',
      [id]
    )
    res.json({ events: events.rows, recipients: recipients.rows })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid campaign ID', details: err.errors })
    }
    logger.error('Failed to get campaign analytics', { campaignId: req.params.id, error: err.message })
    res.status(500).json({ error: 'Failed to get campaign analytics' })
  }
})

module.exports = router
