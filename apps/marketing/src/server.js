const express = require('express')
const cors = require('cors')
const logger = require('./lib/logger')

const app = express()
const PORT = process.env.PORT || 4010

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://admin.homeatelier.ph',
  credentials: true,
}))
app.use(express.json())

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'marketing', timestamp: new Date().toISOString() })
})

// Phase 3 — Core CRUD routes
app.use('/api/contacts', require('./routes/contacts'))
app.use('/api/templates', require('./routes/templates'))
app.use('/api/segments', require('./routes/segments'))

// Phase 4+ — Campaign, tracking, and events
app.use('/api/campaigns', require('./routes/campaigns'))
app.use('/t', require('./routes/tracking'))
app.use('/api/events', require('./routes/events'))

// Phase 5 — Scheduled campaign cron (starts background interval if ENABLE_SCHEDULER=true)
if (process.env.ENABLE_SCHEDULER === 'true') {
  const { startScheduler } = require('./services/scheduler')
  startScheduler()
  logger.info('Campaign scheduler started', { interval: 'every 60s' })
}

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Service running on port ${PORT}`, { port: PORT })
})

module.exports = app
