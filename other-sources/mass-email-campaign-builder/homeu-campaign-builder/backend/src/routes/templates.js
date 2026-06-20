import express from 'express';
import { z } from 'zod';
import { query } from '../lib/db.js';

const router = express.Router();
const schema = z.object({ name: z.string(), subject: z.string(), preheader: z.string().optional(), html_body: z.string(), text_body: z.string().optional() });

router.get('/', async (_, res) => {
  const result = await query('SELECT * FROM email_templates ORDER BY created_at DESC');
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const body = schema.parse(req.body);
  const result = await query(
    'INSERT INTO email_templates (name, subject, preheader, html_body, text_body) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [body.name, body.subject, body.preheader, body.html_body, body.text_body]
  );
  res.status(201).json(result.rows[0]);
});

router.put('/:id', async (req, res) => {
  const body = schema.parse(req.body);
  const result = await query(
    'UPDATE email_templates SET name=$1, subject=$2, preheader=$3, html_body=$4, text_body=$5, updated_at=now() WHERE id=$6 RETURNING *',
    [body.name, body.subject, body.preheader, body.html_body, body.text_body, req.params.id]
  );
  res.json(result.rows[0]);
});

export default router;
