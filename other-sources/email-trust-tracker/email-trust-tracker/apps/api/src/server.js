import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { query } from './db.js';
import { calculateLeadScore, classifyLead } from './scoring.js';
import { escapeVcf, hashIp, safeRedirectUrl } from './security.js';

const app = express();
const port = Number(process.env.PORT || 4010);
const origins = (process.env.FRONTEND_ORIGINS || '').split(',').map((x) => x.trim()).filter(Boolean);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: origins.length ? origins : true }));
app.use(express.json({ limit: '1mb' }));

const transparentGif = Buffer.from('R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64');

async function recordEvent(req, payload) {
  const userAgent = req.get('user-agent') || '';
  const ipHash = hashIp(req.ip || req.socket?.remoteAddress || '');
  await query(
    `INSERT INTO email_events (message_id, customer_id, event_type, url, product_id, user_agent, ip_hash, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [payload.message_id || null, payload.customer_id || null, payload.event_type, payload.url || null, payload.product_id || null, userAgent, ipHash, payload.metadata || {}]
  );
}

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/customers', async (req, res) => {
  const body = z.object({
    email: z.string().email(),
    full_name: z.string().optional(),
    mobile: z.string().optional(),
    role: z.enum(['architect','designer','contractor','homeowner','other']).optional(),
    company: z.string().optional(),
    marketing_consent: z.boolean().optional()
  }).parse(req.body);

  const result = await query(
    `INSERT INTO customers (email, full_name, mobile, role, company, marketing_consent)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (email) DO UPDATE SET
       full_name = COALESCE(EXCLUDED.full_name, customers.full_name),
       mobile = COALESCE(EXCLUDED.mobile, customers.mobile),
       role = COALESCE(EXCLUDED.role, customers.role),
       company = COALESCE(EXCLUDED.company, customers.company),
       marketing_consent = EXCLUDED.marketing_consent,
       updated_at = now()
     RETURNING *`,
    [body.email, body.full_name || null, body.mobile || null, body.role || 'other', body.company || null, Boolean(body.marketing_consent)]
  );
  res.status(201).json(result.rows[0]);
});

app.post('/campaigns', async (req, res) => {
  const body = z.object({ name: z.string(), subject: z.string(), sender_email: z.string().email() }).parse(req.body);
  const result = await query(
    `INSERT INTO email_campaigns (name, subject, sender_email) VALUES ($1,$2,$3) RETURNING *`,
    [body.name, body.subject, body.sender_email]
  );
  res.status(201).json(result.rows[0]);
});

app.post('/messages', async (req, res) => {
  const body = z.object({ campaign_id: z.string().uuid().optional(), customer_id: z.string().uuid(), provider_message_id: z.string().optional() }).parse(req.body);
  const result = await query(
    `INSERT INTO email_messages (campaign_id, customer_id, provider_message_id, status, sent_at)
     VALUES ($1,$2,$3,'sent',now()) RETURNING *`,
    [body.campaign_id || null, body.customer_id, body.provider_message_id || null]
  );
  res.status(201).json(result.rows[0]);
});

app.get('/t/open/:messageId.gif', async (req, res) => {
  const messageId = req.params.messageId;
  const found = await query(`SELECT customer_id FROM email_messages WHERE id = $1`, [messageId]);
  if (found.rowCount) {
    await recordEvent(req, { message_id: messageId, customer_id: found.rows[0].customer_id, event_type: 'open' });
  }
  res.set('Content-Type', 'image/gif');
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.send(transparentGif);
});

app.get('/t/click/:messageId', async (req, res) => {
  const destination = safeRedirectUrl(req.query.url);
  if (!destination) return res.status(400).send('Invalid redirect URL');
  const found = await query(`SELECT customer_id FROM email_messages WHERE id = $1`, [req.params.messageId]);
  if (found.rowCount) {
    await recordEvent(req, { message_id: req.params.messageId, customer_id: found.rows[0].customer_id, event_type: 'click', url: destination });
  }
  res.redirect(302, destination);
});

app.post('/events', async (req, res) => {
  const body = z.object({
    customer_id: z.string().uuid(),
    event_type: z.enum(['product_view','rfq_add','rfq_submit','appointment_booked','contact_card_download','reply_prompt_seen']),
    url: z.string().url().optional(),
    product_id: z.string().optional(),
    metadata: z.record(z.any()).optional()
  }).parse(req.body);
  await recordEvent(req, body);
  res.json({ ok: true });
});

app.get('/contact.vcf', async (req, res) => {
  const name = process.env.CONTACT_NAME || 'HomeU';
  const email = process.env.CONTACT_EMAIL || 'sales@homeu.ph';
  const phone = process.env.CONTACT_PHONE || '';
  const website = process.env.CONTACT_WEBSITE || 'https://homeu.ph';
  if (req.query.customer_id) {
    await recordEvent(req, { customer_id: String(req.query.customer_id), event_type: 'contact_card_download' });
  }
  const vcf = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escapeVcf(name)}`,
    `ORG:${escapeVcf(name)}`,
    `EMAIL;TYPE=INTERNET:${escapeVcf(email)}`,
    phone ? `TEL;TYPE=WORK,VOICE:${escapeVcf(phone)}` : '',
    `URL:${escapeVcf(website)}`,
    'END:VCARD'
  ].filter(Boolean).join('\r\n');
  res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="homeu-contact.vcf"');
  res.send(vcf);
});

app.get('/stats/summary', async (_req, res) => {
  const result = await query(`
    SELECT
      COUNT(*)::int AS customers,
      COALESCE(SUM(sent_count),0)::int AS sent,
      COALESCE(SUM(open_count),0)::int AS opens,
      COALESCE(SUM(click_count),0)::int AS clicks,
      COALESCE(SUM(rfq_count),0)::int AS rfqs,
      COALESCE(SUM(appointment_count),0)::int AS appointments
    FROM customer_email_stats
  `);
  res.json(result.rows[0]);
});

app.get('/stats/customers', async (_req, res) => {
  const result = await query(`SELECT * FROM customer_email_stats ORDER BY last_activity_at DESC NULLS LAST LIMIT 200`);
  const rows = result.rows.map((row) => {
    const score = calculateLeadScore(row);
    return { ...row, lead_score: score, lead_status: classifyLead(score) };
  });
  res.json(rows);
});

app.get('/stats/customers/:customerId/events', async (req, res) => {
  const result = await query(`SELECT * FROM email_events WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 100`, [req.params.customerId]);
  res.json(result.rows);
});

app.listen(port, () => {
  console.log(`Email Trust API running on port ${port}`);
});
