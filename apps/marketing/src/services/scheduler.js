const { query } = require('../db')
const logger = require('../lib/logger')

const POLL_INTERVAL_MS = 60_000

/**
 * Campaign scheduler — polls every 60s for draft campaigns whose
 * scheduled_at has passed, activates them by setting status = 'sending'.
 *
 * Starts a background setInterval; call startScheduler() once at boot.
 */
function startScheduler() {
  logger.info('Campaign scheduler started', { interval: '60s' })

  setInterval(async () => {
    try {
      const result = await query(
        `UPDATE campaigns
         SET status = 'sending', updated_at = now()
         WHERE status = 'draft'
           AND scheduled_at IS NOT NULL
           AND scheduled_at <= now()
         RETURNING id, name, scheduled_at`
      )

      for (const row of result.rows) {
        logger.info('Scheduled campaign activated', {
          campaignId: row.id,
          name: row.name,
          scheduledAt: row.scheduled_at,
        })
      }

      if (result.rows.length > 0) {
        logger.info(`Scheduler activated ${result.rows.length} campaign(s)`)
      }
    } catch (err) {
      logger.error('Scheduler poll failed', { error: err.message })
    }
  }, POLL_INTERVAL_MS)
}

module.exports = { startScheduler }
