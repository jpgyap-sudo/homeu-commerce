#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════
 *  BUILD AGENT — Persistent Docker Build Coordinator
 *  For ALL coding extensions: Kilo Code, Claude Code, Codex,
 *  Blackbox, Roo Code, Cline, etc.
 *
 *  Purpose:
 *    - Centralized Docker build that ALL agents call the same way
 *    - PostgreSQL locking prevents concurrent builds
 *    - Results logged to central-logger (task-log.jsonl)
 *    - Structured JSON output for machine parsing
 *    - Supports builder-stage and full-image targets
 *
 *  Usage (from any agent):
 *    node tools/build-agent/build-agent.mjs              # builder stage (default)
 *    node tools/build-agent/build-agent.mjs --full        # full production image
 *    node tools/build-agent/build-agent.mjs --status      # check build status
 *    node tools/build-agent/build-agent.mjs --help        # show help
 *
 *  Environment:
 *    BUILD_AGENT_ID         - agent name for logging (default: auto-detect)
 *    PGHOST / PGUSER / etc  - PostgreSQL connection (defaults: localhost/homeu)
 * ════════════════════════════════════════════════════════════
 */

import { execSync } from 'child_process'
import { existsSync, appendFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_DIR = resolve(__dirname, '..', '..')
const TASK_LOG_PATH = resolve(PROJECT_DIR, 'memory/task-log.jsonl')

// =============================================
// CONFIGURATION
// =============================================

const AGENT_ID = process.env.BUILD_AGENT_ID || `build-agent-${randomUUID().slice(0, 8)}`
const EXTENSION_HINT = process.env.DEPLOYER_EXTENSION_ID || process.env._AGENT_NAME || AGENT_ID

const DB = {
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER || 'homeu',
  password: process.env.PGPASSWORD || 'homeu_local_password',
  database: process.env.PGDATABASE || 'homeu',
}

const DOCKER_BUILD_TIMEOUT = 900_000 // 15 minutes

// =============================================
// LOGGING
// =============================================

function getTimestamp() {
  return new Date().toISOString()
}

function log(...args) {
  console.error(...args)
}

function logTask({ agent, status, summary, files = [], verification = '' }) {
  const entry = {
    timestamp: getTimestamp(),
    agent,
    status,
    summary,
    files,
    verification,
  }
  const line = JSON.stringify(entry) + '\n'
  try {
    appendFileSync(TASK_LOG_PATH, line, { encoding: 'utf8' })
  } catch (err) {
    log(`[build-agent] Failed to log task: ${err.message}`)
  }
}

// =============================================
// POSTGRES CONNECTION (lazy)
// =============================================

let pgPool = null

async function getPg() {
  if (pgPool) return pgPool
  try {
    const { default: pg } = await import('pg')
    pgPool = new pg.Pool({
      connectionString: `postgresql://${DB.user}:${DB.password}@${DB.host}:${DB.port}/${DB.database}`,
      max: 2,
      connectionTimeoutMillis: 5000,
    })
    // Test connection
    const client = await pgPool.connect()
    await client.query('SELECT 1')
    client.release()
    log(`[build-agent] Connected to PostgreSQL at ${DB.host}:${DB.port}/${DB.database}`)
    return pgPool
  } catch (err) {
    log(`[build-agent] PostgreSQL unavailable: ${err.message}`)
    log(`[build-agent] Running without coordination (no lock/queue)`)
    return null
  }
}

// =============================================
// LOCK / QUEUE (same tables as deployer-agent)
// =============================================

async function ensureSchema(pool) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deployer_locks (
        id SERIAL PRIMARY KEY,
        lock_key VARCHAR(100) UNIQUE NOT NULL,
        locked_by VARCHAR(100),
        locked_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        status VARCHAR(20) DEFAULT 'locked',
        metadata JSONB
      )
    `)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deployer_queue (
        id SERIAL PRIMARY KEY,
        task_type VARCHAR(50) NOT NULL,
        priority INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'queued',
        requested_by VARCHAR(100),
        request_id VARCHAR(100) UNIQUE,
        params JSONB,
        result JSONB,
        error TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ
      )
    `)
  } catch (err) {
    log(`[build-agent] Schema ensure warning: ${err.message}`)
  }
}

async function acquireBuildLock(pool, timeout = 600) {
  const lockKey = 'build'
  const lockId = `${lockKey}-${new Date().toISOString().slice(0, 16)}`

  try {
    // Clean expired locks
    await pool.query(
      `DELETE FROM deployer_locks WHERE lock_key = $1 AND expires_at < NOW()`,
      [lockKey]
    )

    // Try to insert
    await pool.query(
      `INSERT INTO deployer_locks (lock_key, locked_by, expires_at, status)
       VALUES ($1, $2, NOW() + INTERVAL '${timeout} seconds', 'locked')
       ON CONFLICT (lock_key) DO UPDATE
       SET locked_by = EXCLUDED.locked_by,
           expires_at = NOW() + INTERVAL '${timeout} seconds',
           status = 'locked'
       WHERE deployer_locks.expires_at < NOW()`,
      [lockKey, EXTENSION_HINT]
    )

    // Check if we got it
    const result = await pool.query(
      `SELECT * FROM deployer_locks WHERE lock_key = $1 AND locked_by = $2 AND status = 'locked'`,
      [lockKey, EXTENSION_HINT]
    )

    if (result.rows.length > 0) {
      log(`[build-agent] 🔒 Build lock acquired by ${EXTENSION_HINT}`)
      return true
    }

    const existing = await pool.query(
      `SELECT locked_by, expires_at FROM deployer_locks WHERE lock_key = $1 AND status = 'locked'`,
      [lockKey]
    )
    if (existing.rows.length > 0) {
      log(`[build-agent] ⚠️  Build lock held by: ${existing.rows[0].locked_by} (expires ${existing.rows[0].expires_at})`)
    }
    return false
  } catch (err) {
    log(`[build-agent] Lock error: ${err.message}`)
    return false
  }
}

async function releaseBuildLock(pool) {
  try {
    await pool.query(
      `UPDATE deployer_locks SET status = 'completed' WHERE lock_key = 'build' AND locked_by = $1`,
      [EXTENSION_HINT]
    )
    log(`[build-agent] 🔓 Build lock released`)
  } catch (err) {
    log(`[build-agent] Lock release warning: ${err.message}`)
  }
}

async function enqueueBuild(pool, target, priority = 0) {
  try {
    const requestId = `build-${target}-${randomUUID().slice(0, 8)}`
    const result = await pool.query(
      `INSERT INTO deployer_queue (task_type, priority, status, requested_by, request_id, params)
       VALUES ($1, $2, 'queued', $3, $4, $5)
       RETURNING id`,
      ['build', priority, EXTENSION_HINT, requestId, JSON.stringify({ target })]
    )
    log(`[build-agent] 📋 Build queued as #${result.rows[0].id}`)
    return { id: result.rows[0].id, status: 'queued' }
  } catch (err) {
    log(`[build-agent] Queue error: ${err.message}`)
    return null
  }
}

async function recordBuildComplete(pool, queueId, status, result) {
  try {
    await pool.query(
      `UPDATE deployer_queue SET status = $1, result = $2, completed_at = NOW() WHERE id = $3`,
      [status, JSON.stringify(result), queueId]
    )
  } catch (err) {
    log(`[build-agent] Record warning: ${err.message}`)
  }
}

// =============================================
// DOCKER BUILD
// =============================================

/**
 * Run the Docker build.
 * @param {'builder'|'full'} target
 * @returns {{ success: boolean, output: string, duration: number, imageTag?: string }}
 */
function runDockerBuild(target) {
  const startTime = Date.now()
  const tag = target === 'full' ? 'homeu-website:latest' : 'homeu-website:builder'

  log(`[build-agent] 🏗️  Building Docker image: ${tag} (target: ${target})`)

  try {
    const buildArgs = ['build']
    if (target === 'builder') {
      buildArgs.push('--target', 'builder')
    }
    buildArgs.push('-t', tag, '.')

    const output = execSync(`docker ${buildArgs.join(' ')} 2>&1`, {
      cwd: PROJECT_DIR,
      encoding: 'utf-8',
      timeout: DOCKER_BUILD_TIMEOUT,
      maxBuffer: 50 * 1024 * 1024, // 50MB
    })

    const duration = Math.round((Date.now() - startTime) / 1000)
    log(`[build-agent] ✅ Build complete: ${tag} (${duration}s)`)

    return {
      success: true,
      imageTag: tag,
      output: output.trim(),
      duration,
    }
  } catch (err) {
    const duration = Math.round((Date.now() - startTime) / 1000)
    const errorMsg = err.stderr?.trim() || err.message || 'Unknown build error'

    log(`[build-agent] ❌ Build failed: ${errorMsg.slice(0, 200)} (${duration}s)`)

    return {
      success: false,
      output: errorMsg,
      duration,
      error: errorMsg,
    }
  }
}

// =============================================
// STATUS
// =============================================

async function showStatus(pool) {
  log(`\n📊 BUILD AGENT STATUS`)
  log(`═══════════════════════════`)
  log(`Agent: ${AGENT_ID}`)
  log(`Extension: ${EXTENSION_HINT}`)
  log(`Project: ${PROJECT_DIR}`)
  log(`Docker: ${isDockerAvailable() ? '✅ available' : '❌ not available'}`)
  log('')

  if (!pool) {
    log('⚠️  PostgreSQL unavailable — running without coordination')
    log('')
    return { docker: isDockerAvailable(), pg: false }
  }

  try {
    const locks = (await pool.query(
      "SELECT lock_key, locked_by, status, expires_at FROM deployer_locks WHERE status = 'locked' ORDER BY lock_key"
    )).rows
    const queue = (await pool.query(
      "SELECT id, task_type, status, priority, requested_by, created_at FROM deployer_queue WHERE status != 'completed' ORDER BY priority DESC, created_at DESC LIMIT 10"
    )).rows

    log('🔒 LOCKS:')
    if (locks.length === 0) log('  (none)')
    for (const l of locks) {
      log(`  ${l.lock_key}: ${l.status} by ${l.locked_by} (exp ${l.expires_at?.slice(0, 19) || 'N/A'})`)
    }
    log('')
    log('📋 QUEUE:')
    if (queue.length === 0) log('  (empty)')
    for (const q of queue) {
      log(`  #${q.id} ${q.task_type} [${q.status}] p${q.priority} req by ${q.requested_by} ${q.created_at?.slice(0, 19)}`)
    }
    log('')

    return { docker: isDockerAvailable(), pg: true, locks, queue }
  } catch (err) {
    log(`Status error: ${err.message}`)
    return { docker: isDockerAvailable(), pg: true, error: err.message }
  }
}

function isDockerAvailable() {
  try {
    execSync('docker info --format "{{.ServerVersion}}" 2>&1', {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    return true
  } catch {
    return false
  }
}

// =============================================
// MAIN
// =============================================

async function main() {
  const args = process.argv.slice(2)

  // Help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
BUILD AGENT — Persistent Docker Build Coordinator

Usage:
  node tools/build-agent/build-agent.mjs [options]

Options:
  (no args)     Build builder stage only (faster, for CI/verification)
  --full        Build full production image (slower, for deploy)
  --status      Show build system status (locks, queue, docker availability)
  --help        Show this help message

Environment:
  BUILD_AGENT_ID       Custom agent identifier for logging
  DEPLOYER_EXTENSION_ID  Extension identifier for lock system
  PGHOST / PGPORT / PGUSER / PGPASSWORD / PGDATABASE

Examples:
  node tools/build-agent/build-agent.mjs
  node tools/build-agent/build-agent.mjs --full
  node tools/build-agent/build-agent.mjs --status

Coordination:
  All builds use PostgreSQL locks (deployer_locks table) shared with
  the Deployer Agent. Only one build runs at a time across all
  coding extensions (Kilo, Claude, Codex, Blackbox, Roo, etc.).
  Results are logged to memory/task-log.jsonl for full audit trail.
`)
    process.exit(0)
  }

  // Status
  if (args.includes('--status')) {
    const pool = await getPg()
    await showStatus(pool)
    if (pool) await pool.end()
    process.exit(0)
  }

  // Determine target
  const target = args.includes('--full') ? 'full' : 'builder'
  const buildLabel = target === 'full' ? 'Full Production Image' : 'Builder Stage'

  log(`[build-agent] ⚡ Starting ${buildLabel} build`)
  log(`[build-agent]    Agent: ${AGENT_ID}`)
  log(`[build-agent]    Extension hint: ${EXTENSION_HINT}`)
  log(`[build-agent]    Project: ${PROJECT_DIR}`)

  // Check Docker
  if (!isDockerAvailable()) {
    const msg = 'Docker is not available or not running'
    log(`[build-agent] ❌ ${msg}`)
    logTask({
      agent: AGENT_ID,
      status: 'blocked',
      summary: `Docker build failed: ${msg}`,
      files: ['Dockerfile'],
      verification: 'Docker daemon check failed',
    })
    console.error(msg)
    process.exit(1)
  }

  // Try PostgreSQL for coordination
  const pool = await getPg()
  let useCoordination = false
  let queueId = null

  if (pool) {
    await ensureSchema(pool)
    const locked = await acquireBuildLock(pool)
    if (!locked) {
      const queued = await enqueueBuild(pool, target, 1)
      const msg = queued
        ? `⚠️ Build locked by another agent. Queued as #${queued.id}. Try '--status' to check queue.`
        : '⚠️ Build locked by another agent. Could not queue. Try again later.'
      log(`[build-agent] ${msg}`)
      logTask({
        agent: AGENT_ID,
        status: 'blocked',
        summary: `Docker build blocked: lock held by another extension`,
        files: ['Dockerfile', 'tools/build-agent/build-agent.mjs'],
        verification: msg,
      })
      if (pool) await pool.end()
      console.error(msg)
      process.exit(1)
    }
    useCoordination = true
    const queued = await enqueueBuild(pool, target, 2)
    queueId = queued?.id
  }

  // Log task start
  logTask({
    agent: AGENT_ID,
    status: 'active',
    summary: `Docker ${buildLabel} build started`,
    files: ['Dockerfile'],
    verification: 'Running docker build',
  })

  // Run the build
  const buildResult = runDockerBuild(target)

  // Log completion
  const taskStatus = buildResult.success ? 'completed' : 'blocked'
  logTask({
    agent: AGENT_ID,
    status: taskStatus,
    summary: buildResult.success
      ? `Docker ${buildLabel} build SUCCESS (${buildResult.duration}s, ${buildResult.imageTag})`
      : `Docker ${buildLabel} build FAILED: ${buildResult.error?.slice(0, 100)}`,
    files: ['Dockerfile'],
    verification: buildResult.success ? `Image ${buildResult.imageTag} built in ${buildResult.duration}s` : buildResult.error?.slice(0, 200),
  })

  // Record in queue
  if (useCoordination && pool && queueId) {
    await recordBuildComplete(pool, queueId, buildResult.success ? 'completed' : 'failed', buildResult)
  }

  // Release lock
  if (useCoordination && pool) {
    await releaseBuildLock(pool)
  }

  // Close DB
  if (pool) await pool.end()

  // Output structured JSON to stdout for machine parsing
  const output = {
    success: buildResult.success,
    target,
    imageTag: buildResult.imageTag || null,
    duration: buildResult.duration,
    agent: AGENT_ID,
    timestamp: getTimestamp(),
    summary: buildResult.success
      ? `✅ ${buildLabel} build completed in ${buildResult.duration}s`
      : `❌ ${buildLabel} build failed after ${buildResult.duration}s`,
  }

  console.log(JSON.stringify(output, null, 2))

  process.exit(buildResult.success ? 0 : 1)
}

main().catch(err => {
  log(`[build-agent] Fatal: ${err.message}`)
  process.exit(1)
})
