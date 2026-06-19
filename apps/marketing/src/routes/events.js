const express = require('express')
const { z } = require('zod')
const { query } = require('../db')
const logger = require('../lib/logger')

const router = express.Router()

// --- Zod schemas ---
const querySchema = z.object({
  campaign_id: z.coerce.number().int().positive().optional(),
  contact_id: z.coerce.number().int().positive().optional(),
  event_type: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

const campaignIdParamSchema = z.object({
  campaignId: z.coerce.number().int().positive(),
})

// GET / — list events with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { campaign_id, contact_id, event_type, start_date, end_date, page, limit } = querySchema.parse(req.query)

    const pageNum = page
    const limitNum = limit
    const offset = (pageNum - 1) * limitNum

    const values = []
    const conditions = []

    if (campaign_id) {
      values.push(campaign_id)
      conditions.push(`e.campaign_id = $${values.length}`)
    }
    if (contact_id) {
      values.push(contact_id)
      conditions.push(`e.contact_id = $${values.length}`)
    }
    if (event_type) {
      values.push(event_type)
      conditions.push(`e.event_type = $${values.length}`)
    }
    if (start_date) {
      values.push(start_date)
      conditions.push(`e.created_at >= $${values.length}`)
    }
    if (end_date) {
      values.push(end_date)
      conditions.push(`e.created_at <= $${values.length}`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Total count
    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM email_events e ${whereClause}`,
      values
    )
    const total = countResult.rows[0].total

    // Fetch page
    const result = await query(
      `SELECT e.* FROM email_events e ${whereClause} ORDER BY e.created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limitNum, offset]
    )

    res.json({ events: result.rows, total, page: pageNum, limit: limitNum })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: err.errors })
    }
    logger.error('Failed to fetch events', { error: err.message })
    res.status(500).json({ error: 'Failed to fetch events' })
  }
})

// GET /:id — single event by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const result = await query('SELECT * FROM email_events WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid event ID', details: err.errors })
    }
    logger.error('Failed to fetch event', { eventId: req.params.id, error: err.message })
    res.status(500).json({ error: 'Failed to fetch event' })
  }
})

// GET /campaign/:campaignId/summary — aggregated event counts per campaign
router.get('/campaign/:campaignId/summary', async (req, res) => {
  try {
    const { campaignId } = campaignIdParamSchema.parse(req.params)

    // Verify campaign exists
    const campaign = await query('SELECT id, name FROM campaigns WHERE id = $1', [campaignId])
    if (campaign.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' })
    }

    // Event counts by type
    const events = await query(
      'SELECT event_type, COUNT(*)::int AS count FROM email_events WHERE campaign_id = $1 GROUP BY event_type ORDER BY event_type',
      [campaignId]
    )

    // Total events
    const totalResult = await query(
      'SELECT COUNT(*)::int AS total_events FROM email_events WHERE campaign_id = $1',
      [campaignId]
    )

    // Unique contacts reached
    const contactsResult = await query(
      'SELECT COUNT(DISTINCT contact_id)::int AS unique_contacts FROM email_events WHERE campaign_id = $1 AND contact_id IS NOT NULL',
      [campaignId]
    )

    // Calculate rates from the event counts
    const eventMap = {}
    for (const row of events.rows) {
      eventMap[row.event_type] = row.count
    }

    const delivered = eventMap.delivered || 0
    const opens = eventMap.open || 0
    const clicks = eventMap.click || 0
    const unsubscribes = eventMap.unsubscribe || 0

    const open_rate = delivered > 0 ? Math.round((opens / delivered) * 10000) / 100 : 0
    const click_rate = opens > 0 ? Math.round((clicks / opens) * 10000) / 100 : 0
    const unsubscribe_rate = delivered > 0 ? Math.round((unsubscribes / delivered) * 10000) / 100 : 0

    res.json({
      campaign_id: campaignId,
      campaign_name: campaign.rows[0].name,
      events: events.rows,
      total_events: totalResult.rows[0].total_events,
      unique_contacts: contactsResult.rows[0].unique_contacts,
      open_rate,
      click_rate,
      unsubscribe_rate,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid campaign ID', details: err.errors })
    }
    logger.error('Failed to fetch campaign summary', { campaignId: req.params.campaignId, error: err.message })
    res.status(500).json({ error: 'Failed to fetch campaign summary' })
  }
})

module.exports = router
