import { query } from '../lib/db.js';

export async function getContactsForSegment(segmentId) {
  const segment = await query('SELECT * FROM segments WHERE id=$1', [segmentId]);
  if (segment.rowCount === 0) throw new Error('Segment not found');

  const rule = segment.rows[0].rule || {};
  const values = [];
  const where = ['c.email IS NOT NULL', 's.email IS NULL'];

  if (rule.marketing_consent !== undefined) {
    values.push(rule.marketing_consent);
    where.push(`c.marketing_consent = $${values.length}`);
  }
  if (rule.role) {
    values.push(rule.role);
    where.push(`c.role = $${values.length}`);
  }
  if (rule.lead_score_gte !== undefined) {
    values.push(rule.lead_score_gte);
    where.push(`c.lead_score >= $${values.length}`);
  }
  if (rule.tag) {
    values.push(rule.tag);
    where.push(`$${values.length} = ANY(c.tags)`);
  }

  const result = await query(
    `SELECT c.* FROM contacts c LEFT JOIN suppression_list s ON lower(s.email)=lower(c.email) WHERE ${where.join(' AND ')} ORDER BY c.created_at DESC`,
    values
  );
  return result.rows;
}
