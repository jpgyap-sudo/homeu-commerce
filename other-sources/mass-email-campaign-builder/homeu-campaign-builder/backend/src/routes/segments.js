import express from 'express';
import { query } from '../lib/db.js';
import { getContactsForSegment } from '../services/segmentService.js';

const router = express.Router();

router.get('/', async (_, res) => {
  const result = await query('SELECT * FROM segments ORDER BY created_at DESC');
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const { name, description, rule } = req.body;
  const result = await query('INSERT INTO segments (name, description, rule) VALUES ($1,$2,$3) RETURNING *', [name, description, rule || {}]);
  res.status(201).json(result.rows[0]);
});

router.get('/:id/preview', async (req, res) => {
  const contacts = await getContactsForSegment(req.params.id);
  res.json({ count: contacts.length, contacts: contacts.slice(0, 50) });
});

export default router;
