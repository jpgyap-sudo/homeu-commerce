const { query } = require('../db')
const logger = require('../lib/logger')

// Scoring weights per event type — configurable via SCORE_WEIGHTS env var (JSON)
function loadScoreWeights() {
  const defaults = {
    delivered: 1,
    open: 5,
    click: 10,
    rfq_submit: 30,
    appointment_booked: 25,
    unsubscribe: -50,
    bounce: -20,
    complaint: -20,
  }
  if (process.env.SCORE_WEIGHTS) {
    try {
      const overrides = JSON.parse(process.env.SCORE_WEIGHTS)
      const merged = { ...defaults, ...overrides }
      logger.info('SCORE_WEIGHTS loaded from env', { overrides })
      return merged
    } catch (e) {
      logger.warn('Invalid SCORE_WEIGHTS env var, using defaults', { error: e.message })
    }
  }
  return defaults
}

const SCORE_WEIGHTS = loadScoreWeights()

/**
 * Recalculate lead_score for a single contact based on summed weighted events.
 * Updates the contacts table and returns the new score.
 */
async function calculateScore(contactId) {
  try {
    const result = await query(
      `SELECT COALESCE(SUM(
         CASE e.event_type
           WHEN 'delivered' THEN $1
           WHEN 'open' THEN $2
           WHEN 'click' THEN $3
           WHEN 'rfq_submit' THEN $4
           WHEN 'appointment_booked' THEN $5
           WHEN 'unsubscribe' THEN $6
           WHEN 'bounce' THEN $7
           WHEN 'complaint' THEN $8
           ELSE 0
         END
       ), 0)::int AS calculated_score
       FROM email_events e
       WHERE e.contact_id = $9`,
      [
        SCORE_WEIGHTS.delivered,
        SCORE_WEIGHTS.open,
        SCORE_WEIGHTS.click,
        SCORE_WEIGHTS.rfq_submit,
        SCORE_WEIGHTS.appointment_booked,
        SCORE_WEIGHTS.unsubscribe,
        SCORE_WEIGHTS.bounce,
        SCORE_WEIGHTS.complaint,
        contactId,
      ]
    )

    const newScore = Math.max(0, result.rows[0].calculated_score)

    await query('UPDATE contacts SET lead_score = $1, updated_at = now() WHERE id = $2', [
      newScore,
      contactId,
    ])

    return newScore
  } catch (err) {
    logger.error('calculateScore error', { contactId, error: err.message })
    throw err
  }
}

/**
 * Batch recalculate lead_score for ALL contacts that have any email_events.
 * Uses a single UPDATE with a subquery for efficiency.
 * Returns the number of contacts updated.
 */
async function recalculateAll() {
  try {
    const result = await query(`
      UPDATE contacts c
      SET lead_score = (
        SELECT COALESCE(SUM(
          CASE e.event_type
            WHEN 'delivered' THEN ${SCORE_WEIGHTS.delivered}
            WHEN 'open' THEN ${SCORE_WEIGHTS.open}
            WHEN 'click' THEN ${SCORE_WEIGHTS.click}
            WHEN 'rfq_submit' THEN ${SCORE_WEIGHTS.rfq_submit}
            WHEN 'appointment_booked' THEN ${SCORE_WEIGHTS.appointment_booked}
            WHEN 'unsubscribe' THEN ${SCORE_WEIGHTS.unsubscribe}
            WHEN 'bounce' THEN ${SCORE_WEIGHTS.bounce}
            WHEN 'complaint' THEN ${SCORE_WEIGHTS.complaint}
            ELSE 0
          END
        ), 0)::int
        FROM email_events e
        WHERE e.contact_id = c.id
      ),
      updated_at = now()
      WHERE EXISTS (
        SELECT 1 FROM email_events e WHERE e.contact_id = c.id
      )
    `)

    const updated = result.rowCount || 0
    logger.info('recalculateAll completed', { updated })
    return updated
  } catch (err) {
    logger.error('recalculateAll error', { error: err.message })
    throw err
  }
}

/**
 * Get a detailed breakdown of event counts and weighted contributions for a contact.
 * Useful for debugging and admin displays.
 */
async function getScoreBreakdown(contactId) {
  try {
    const contact = await query(
      'SELECT id, email, lead_score FROM contacts WHERE id = $1',
      [contactId]
    )
    if (contact.rows.length === 0) {
      throw new Error('Contact not found')
    }

    const breakdown = await query(
      `SELECT
         e.event_type,
         COUNT(*)::int AS count,
         CASE e.event_type
           WHEN 'delivered' THEN ${SCORE_WEIGHTS.delivered}
           WHEN 'open' THEN ${SCORE_WEIGHTS.open}
           WHEN 'click' THEN ${SCORE_WEIGHTS.click}
           WHEN 'rfq_submit' THEN ${SCORE_WEIGHTS.rfq_submit}
           WHEN 'appointment_booked' THEN ${SCORE_WEIGHTS.appointment_booked}
           WHEN 'unsubscribe' THEN ${SCORE_WEIGHTS.unsubscribe}
           WHEN 'bounce' THEN ${SCORE_WEIGHTS.bounce}
           WHEN 'complaint' THEN ${SCORE_WEIGHTS.complaint}
           ELSE 0
         END AS weight
       FROM email_events e
       WHERE e.contact_id = $1
       GROUP BY e.event_type
       ORDER BY e.event_type`,
      [contactId]
    )

    let totalCalculated = 0
    const breakdownRows = breakdown.rows.map((row) => {
      const contribution = row.count * row.weight
      totalCalculated += contribution
      return {
        event_type: row.event_type,
        count: row.count,
        weight: row.weight,
        contribution,
      }
    })

    return {
      contact_id: contactId,
      email: contact.rows[0].email,
      current_score: contact.rows[0].lead_score,
      breakdown: breakdownRows,
      total_calculated: Math.max(0, totalCalculated),
    }
  } catch (err) {
    logger.error('getScoreBreakdown error', { contactId, error: err.message })
    throw err
  }
}

module.exports = {
  SCORE_WEIGHTS,
  calculateScore,
  recalculateAll,
  getScoreBreakdown,
}
