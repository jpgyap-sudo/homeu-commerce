import express from 'express';
import crypto from 'crypto';
import { query } from '../lib/db.js';

const router = express.Router();
const pixel = Buffer.from('R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64');

function ipHash(req) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  return crypto.createHash('sha256').update(String(ip) + (process.env.IP_HASH_SALT || 'homeu')).digest('hex');
}

router.get('/open/:recipientId.gif', async (req, res) => {
  const recipient = await query('SELECT * FROM campaign_recipients WHERE id=$1', [req.params.recipientId]);
  if (recipient.rowCount) {
    const r = recipient.rows[0];
    await query(
      `INSERT INTO email_events (campaign_id, contact_id, recipient_id, event_type, user_agent, ip_hash)
       VALUES ($1,$2,$3,'open',$4,$5)`,
      [r.campaign_id, r.contact_id, r.id, req.header('user-agent'), ipHash(req)]
    );
  }
  res.set('Content-Type', 'image/gif');
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.end(pixel);
});

router.get('/click/:recipientId', async (req, res) => {
  const target = req.query.u;
  if (!target || !/^https?:\/\//.test(target)) return res.status(400).send('Invalid URL');
  const recipient = await query('SELECT * FROM campaign_recipients WHERE id=$1', [req.params.recipientId]);
  if (recipient.rowCount) {
    const r = recipient.rows[0];
    await query(
      `INSERT INTO email_events (campaign_id, contact_id, recipient_id, event_type, url, user_agent, ip_hash)
       VALUES ($1,$2,$3,'click',$4,$5,$6)`,
      [r.campaign_id, r.contact_id, r.id, target, req.header('user-agent'), ipHash(req)]
    );
  }
  res.redirect(target);
});

router.get('/unsubscribe/:recipientId', async (req, res) => {
  const recipient = await query('SELECT * FROM campaign_recipients WHERE id=$1', [req.params.recipientId]);
  if (!recipient.rowCount) return res.status(404).send('Not found');
  const r = recipient.rows[0];
  await query('INSERT INTO suppression_list (email, reason) VALUES ($1, $2) ON CONFLICT(email) DO UPDATE SET reason=$2', [r.email, 'unsubscribe']);
  await query("INSERT INTO email_events (campaign_id, contact_id, recipient_id, event_type) VALUES ($1,$2,$3,'unsubscribe')", [r.campaign_id, r.contact_id, r.id]);
  res.send('<h1>Unsubscribed</h1><p>You will no longer receive marketing emails from HomeU.</p>');
});

router.post('/provider-webhook', async (req, res) => {
  // Map SES/Mailgun/Postmark/Brevo bounce and complaint webhooks here.
  // Always add hard bounces and complaints to suppression_list.
  res.json({ ok: true, note: 'Webhook placeholder received.' });
});

export default router;
