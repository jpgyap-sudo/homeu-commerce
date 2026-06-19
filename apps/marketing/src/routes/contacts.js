const express = require('express')
const { z } = require('zod')
const { query } = require('../db')

const router = express.Router()

const contactSchema = z.object({
  email: z.string().email(),
  first_name: z.string().optional().default(undefined),
  last_name: z.string().optional().default(undefined),
  phone: z.string().optional().default(undefined),
  company: z.string().optional().default(undefined),
  role: z.enum(['architect', 'designer', 'contractor', 'homeowner', 'developer', 'other']).optional().default('other'),
  marketing_consent: z.boolean().optional().default(false),
  consent_source: z.string().optional().default(undefined),
  tags: z.array(z.string()).optional().default([]),
})

// GET / — list contacts (paginated)
router.get('/', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 250, 1000)
  const offset = parseInt(req.query.offset) || 0
  const result = await query(
    'SELECT * FROM contacts ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  )
  res.json({ contacts: result.rows, limit, offset })
})

// GET /:id — single contact
router.get('/:id', async (req, res) => {
  const result = await query('SELECT * FROM contacts WHERE id = $1', [req.params.id])
  if (result.rows.length === 0) return res.status(404).json({ error: 'Contact not found' })
  res.json(result.rows[0])
})

// POST / — create or upsert contact (email as unique key)
router.post('/', async (req, res) => {
  const body = contactSchema.parse(req.body)
  const result = await query(
    `INSERT INTO contacts (email, first_name, last_name, phone, company, role, marketing_consent, consent_source, tags)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT(email) DO UPDATE SET
       first_name        = EXCLUDED.first_name,
       last_name         = EXCLUDED.last_name,
       phone             = EXCLUDED.phone,
       company           = EXCLUDED.company,
       role              = EXCLUDED.role,
       marketing_consent = EXCLUDED.marketing_consent,
       consent_source    = EXCLUDED.consent_source,
       tags              = EXCLUDED.tags,
       updated_at        = now()
     RETURNING *`,
    [
      body.email.toLowerCase(),
      body.first_name,
      body.last_name,
      body.phone,
      body.company,
      body.role,
      body.marketing_consent,
      body.consent_source,
      body.tags,
    ]
  )
  res.status(201).json(result.rows[0])
})

// POST /bulk — bulk upsert contacts
router.post('/bulk', async (req, res) => {
  const contacts = z.array(contactSchema).parse(req.body.contacts || [])
  const saved = []
  for (const c of contacts) {
    const result = await query(
      `INSERT INTO contacts (email, first_name, last_name, phone, company, role, marketing_consent, consent_source, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT(email) DO UPDATE SET
         updated_at=now(), marketing_consent=EXCLUDED.marketing_consent
       RETURNING *`,
      [
        c.email.toLowerCase(),
        c.first_name,
        c.last_name,
        c.phone,
        c.company,
        c.role,
        c.marketing_consent,
        c.consent_source || 'bulk-import',
        c.tags,
      ]
    )
    saved.push(result.rows[0])
  }
  res.json({ imported: saved.length, contacts: saved })
})

// PUT /:id — update contact by ID
router.put('/:id', async (req, res) => {
  const body = contactSchema.partial().parse(req.body)
  const keys = Object.keys(body)
  if (keys.length === 0) return res.status(400).json({ error: 'No fields to update' })

  const sets = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ')
  const values = keys.map((k) => (body[k] !== undefined ? body[k] : null))
  values.push(req.params.id)

  const result = await query(
    `UPDATE contacts SET ${sets}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
    values
  )
  if (result.rows.length === 0) return res.status(404).json({ error: 'Contact not found' })
  res.json(result.rows[0])
})

// DELETE /:id — soft-delete via suppression (move to suppression_list)
router.delete('/:id', async (req, res) => {
  const contact = await query('SELECT * FROM contacts WHERE id = $1', [req.params.id])
  if (contact.rows.length === 0) return res.status(404).json({ error: 'Contact not found' })

  const c = contact.rows[0]
  // Insert into suppression_list
  await query(
    'INSERT INTO suppression_list (email, reason) VALUES ($1, $2) ON CONFLICT(email) DO NOTHING',
    [c.email, 'manual']
  )
  res.json({ ok: true, suppressed: c.email })
})

module.exports = router
