const express = require('express')
const { z } = require('zod')
const { query } = require('../db')

const router = express.Router()

const templateSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  preheader: z.string().optional().default(''),
  html_body: z.string().min(1),
  text_body: z.string().optional().default(''),
})

// GET / — list all templates
router.get('/', async (_req, res) => {
  const result = await query('SELECT * FROM email_templates ORDER BY created_at DESC')
  res.json({ templates: result.rows })
})

// GET /:id — single template
router.get('/:id', async (req, res) => {
  const result = await query('SELECT * FROM email_templates WHERE id = $1', [req.params.id])
  if (result.rows.length === 0) return res.status(404).json({ error: 'Template not found' })
  res.json(result.rows[0])
})

// POST / — create template
router.post('/', async (req, res) => {
  const body = templateSchema.parse(req.body)
  const result = await query(
    'INSERT INTO email_templates (name, subject, preheader, html_body, text_body) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [body.name, body.subject, body.preheader, body.html_body, body.text_body]
  )
  res.status(201).json(result.rows[0])
})

// PUT /:id — update template
router.put('/:id', async (req, res) => {
  const body = templateSchema.parse(req.body)
  const result = await query(
    'UPDATE email_templates SET name=$1, subject=$2, preheader=$3, html_body=$4, text_body=$5, updated_at=now() WHERE id=$6 RETURNING *',
    [body.name, body.subject, body.preheader, body.html_body, body.text_body, req.params.id]
  )
  if (result.rows.length === 0) return res.status(404).json({ error: 'Template not found' })
  res.json(result.rows[0])
})

// DELETE /:id — delete template
router.delete('/:id', async (req, res) => {
  const result = await query('DELETE FROM email_templates WHERE id = $1 RETURNING *', [req.params.id])
  if (result.rows.length === 0) return res.status(404).json({ error: 'Template not found' })
  res.json({ ok: true, deleted: result.rows[0].id })
})

module.exports = router
