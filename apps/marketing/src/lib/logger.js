/**
 * Structured logger for the HomeU Marketing Service.
 * All output is prefixed with ISO timestamp and level tag.
 *
 * Usage:
 *   const logger = require('../lib/logger')
 *   logger.info('Job completed', { jobId, elapsed })
 *   logger.error('Job failed', { jobId, error: err.message })
 */

const isDebug = process.env.DEBUG === 'true'

function timestamp() {
  return new Date().toISOString()
}

function formatMeta(meta) {
  if (meta === undefined || meta === null) return ''
  try {
    return ' ' + JSON.stringify(meta)
  } catch {
    return ' [Circular]'
  }
}

function info(msg, meta) {
  console.log(`[${timestamp()}] [INFO] [marketing] ${msg}${formatMeta(meta)}`)
}

function error(msg, meta) {
  console.error(`[${timestamp()}] [ERROR] [marketing] ${msg}${formatMeta(meta)}`)
}

function warn(msg, meta) {
  console.warn(`[${timestamp()}] [WARN] [marketing] ${msg}${formatMeta(meta)}`)
}

function debug(msg, meta) {
  if (!isDebug) return
  console.log(`[${timestamp()}] [DEBUG] [marketing] ${msg}${formatMeta(meta)}`)
}

module.exports = { info, error, warn, debug }
