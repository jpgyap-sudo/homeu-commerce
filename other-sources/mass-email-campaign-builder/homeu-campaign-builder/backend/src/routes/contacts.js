import express from 'express';
import { z } from 'zod';
import { query } from '../lib/db.js';

const router = express.Router();

const contactSchema = z.object({
  email: z.string().email(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  role: z.enum(['architect','designer','contractor','homeowner','developer','other']).optional(),
  marketing_consent: z.boolean().optional(),
  consent_source: z.string().optional(),
  tags: z.array(z.string()).optional()
});

router.get('/', async (req, res) => {
  const result = await query('SELECT * FROM contacts ORDER BY created_at DESC LIMIT 250');
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const body = contactSchema.parse(req.body);
  const result = await query(
    `INSERT INTO contacts (email, first_name, last_name, phone, company, role, marketing_consent, consent_source, tags)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT(email) DO UPDATE SET
       first_name=EXCLUDED.first_name,
       last_name=EXCLUDED.last_name,
       phone=EXCLUDED.phone,
       company=EXCLUDED.company,
       role=EXCLUDED.role,
       marketing_consent=EXCLUDED.marketing_consent,
       consent_source=EXCLUDED.consent_source,
       tags=EXCLUDED.tags,
       updated_at=now()
     RETURNING *`,
    [body.email.toLowerCase(), body.first_name, body.last_name, body.phone, body.company, body.role || 'other', body.marketing_consent || false, body.consent_source, body.tags || []]
  );
  res.status(201).json(result.rows[0]);
});

router.post('/bulk', async (req, res) => {
  const contacts = z.array(contactSchema).parse(req.body.contacts || []);
  const saved = [];
  for (const c of contacts) {
    const result = await query(
      `INSERT INTO contacts (email, first_name, last_name, phone, company, role, marketing_consent, consent_source, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT(email) DO UPDATE SET updated_at=now(), marketing_consent=EXCLUDED.marketing_consent
       RETURNING *`,
      [c.email.toLowerCase(), c.first_name, c.last_name, c.phone, c.company, c.role || 'other', c.marketing_consent || false, c.consent_source || 'bulk-import', c.tags || []]
    );
    saved.push(result.rows[0]);
  }
  res.json({ imported: saved.length, contacts: saved });
});

export default router;
