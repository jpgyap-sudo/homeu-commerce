import express from 'express';
import { query } from '../lib/db.js';
import { emailQueue } from '../lib/queue.js';
import { getContactsForSegment } from '../services/segmentService.js';

const router = express.Router();

router.get('/', async (_, res) => {
  const result = await query(`
    SELECT c.*, s.name AS segment_name, t.name AS template_name,
      COUNT(r.id)::int AS recipients,
      COUNT(r.id) FILTER (WHERE r.status='sent')::int AS sent
    FROM campaigns c
    LEFT JOIN segments s ON s.id=c.segment_id
    LEFT JOIN email_templates t ON t.id=c.template_id
    LEFT JOIN campaign_recipients r ON r.campaign_id=c.id
    GROUP BY c.id, s.name, t.name
    ORDER BY c.created_at DESC
  `);
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const { name, subject, template_id, segment_id, scheduled_at } = req.body;
  const result = await query(
    'INSERT INTO campaigns (name, subject, template_id, segment_id, scheduled_at) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [name, subject, template_id, segment_id, scheduled_at]
  );
  res.status(201).json(result.rows[0]);
});

router.post('/:id/prepare', async (req, res) => {
  const campaign = await query('SELECT * FROM campaigns WHERE id=$1', [req.params.id]);
  if (!campaign.rowCount) return res.status(404).json({ error: 'Campaign not found' });

  const contacts = await getContactsForSegment(campaign.rows[0].segment_id);
  let inserted = 0;
  for (const contact of contacts) {
    const result = await query(
      `INSERT INTO campaign_recipients (campaign_id, contact_id, email)
       VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING id`,
      [req.params.id, contact.id, contact.email]
    );
    inserted += result.rowCount;
  }
  res.json({ prepared: inserted, totalEligible: contacts.length });
});

router.post('/:id/send', async (req, res) => {
  await query("UPDATE campaigns SET status='sending', updated_at=now() WHERE id=$1", [req.params.id]);
  const recipients = await query("SELECT id FROM campaign_recipients WHERE campaign_id=$1 AND status='queued'", [req.params.id]);
  for (const r of recipients.rows) {
    await emailQueue.add('send-recipient', { recipientId: r.id }, { attempts: 3, backoff: { type: 'exponential', delay: 30000 } });
  }
  res.json({ queued: recipients.rowCount });
});

router.post('/:id/pause', async (req, res) => {
  const result = await query("UPDATE campaigns SET status='paused', updated_at=now() WHERE id=$1 RETURNING *", [req.params.id]);
  res.json(result.rows[0]);
});

router.get('/:id/analytics', async (req, res) => {
  const stats = await query(`
    SELECT event_type, COUNT(*)::int AS count
    FROM email_events WHERE campaign_id=$1 GROUP BY event_type
  `, [req.params.id]);
  const recipients = await query(`
    SELECT status, COUNT(*)::int AS count FROM campaign_recipients WHERE campaign_id=$1 GROUP BY status
  `, [req.params.id]);
  res.json({ events: stats.rows, recipients: recipients.rows });
});

export default router;
