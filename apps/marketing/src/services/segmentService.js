const { query } = require('../db')

/**
 * Evaluate a segment's rules and return matching contacts.
 * Rules format (stored in segments.rules JSONB):
 * {
 *   "marketing_consent": true,
 *   "role": "architect",
 *   "lead_score_gte": 70,
 *   "tag": "hot-lead"
 * }
 */
async function getContactsForSegment(segmentId) {
  const segment = await query('SELECT * FROM segments WHERE id = $1', [segmentId])
  if (segment.rowCount === 0) throw new Error('Segment not found')

  const rules = segment.rows[0].rules || {}
  const values = []
  const where = ['c.email IS NOT NULL', 's.email IS NULL'] // exclude suppressed

  if (rules.marketing_consent !== undefined) {
    values.push(rules.marketing_consent)
    where.push(`c.marketing_consent = $${values.length}`)
  }
  if (rules.role) {
    values.push(rules.role)
    where.push(`c.role = $${values.length}`)
  }
  if (rules.lead_score_gte !== undefined) {
    values.push(rules.lead_score_gte)
    where.push(`c.lead_score >= $${values.length}`)
  }
  if (rules.tag) {
    values.push(rules.tag)
    where.push(`$${values.length} = ANY(c.tags)`)
  }

  const result = await query(
    `SELECT c.* FROM contacts c
     LEFT JOIN suppression_list s ON LOWER(s.email) = LOWER(c.email)
     WHERE ${where.join(' AND ')}
     ORDER BY c.created_at DESC`,
    values
  )
  return result.rows
}

module.exports = { getContactsForSegment }
