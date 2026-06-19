const express = require('express')
const { z } = require('zod')
const { query } = require('../db')
const { getContactsForSegment } = require('../services/segmentService')

const router = express.Router()

// --- Zod schemas ---
const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

const createSegmentSchema = z.object({
  name: z.string().min(1, 'name is required'),
  description: z.string().optional().default(''),
  rules: z.any().optional().default({}),
})

const updateSegmentSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  rules: z.any().optional(),
})

// GET / — list all segments
router.get('/', async (_req, res) => {
  try {
    const result = await query('SELECT * FROM segments ORDER BY created_at DESC')
    res.json({ segments: result.rows })
  } catch (err) {
    res.status(500).json({ error: 'Failed to list segments' })
  }
})

// GET /:id — single segment
router.get('/:id', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const result = await query('SELECT * FROM segments WHERE id = $1', [id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Segment not found' })
    res.json(result.rows[0])
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid segment ID', details: err.errors })
    }
    res.status(500).json({ error: 'Failed to get segment' })
  }
})

// POST / — create segment
router.post('/', async (req, res) => {
  try {
    const data = createSegmentSchema.parse(req.body)
    const result = await query(
      'INSERT INTO segments (name, description, rules) VALUES ($1,$2,$3) RETURNING *',
      [data.name, data.description, data.rules]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    res.status(500).json({ error: 'Failed to create segment' })
  }
})

// PUT /:id — update segment
router.put('/:id', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const data = updateSegmentSchema.parse(req.body)
    const result = await query(
      'UPDATE segments SET name=$1, description=$2, rules=$3, updated_at=now() WHERE id=$4 RETURNING *',
      [data.name, data.description, data.rules, id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Segment not found' })
    res.json(result.rows[0])
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    res.status(500).json({ error: 'Failed to update segment' })
  }
})

// DELETE /:id — delete segment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const result = await query('DELETE FROM segments WHERE id = $1 RETURNING *', [id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Segment not found' })
    res.json({ ok: true, deleted: result.rows[0].id })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid segment ID', details: err.errors })
    }
    res.status(500).json({ error: 'Failed to delete segment' })
  }
})

// GET /:id/preview — evaluate segment and return matching contacts (max 50)
router.get('/:id/preview', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const contacts = await getContactsForSegment(id)
    res.json({ count: contacts.length, contacts: contacts.slice(0, 50) })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid segment ID', details: err.errors })
    }
    if (err.message === 'Segment not found') {
      return res.status(404).json({ error: err.message })
    }
    res.status(500).json({ error: 'Failed to preview segment' })
  }
})

// GET /:id/count — just the count
router.get('/:id/count', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const contacts = await getContactsForSegment(id)
    res.json({ count: contacts.length })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid segment ID', details: err.errors })
    }
    if (err.message === 'Segment not found') {
      return res.status(404).json({ error: err.message })
    }
    res.status(500).json({ error: 'Failed to count segment' })
  }
})

module.exports = router
