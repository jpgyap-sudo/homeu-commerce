#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════
 *  DEPLOYER AGENT MCP SERVER
 *  Central coordination for ALL coding extensions.
 *  Prevents duplicate runs, queues deployments, tracks locks,
 *  and ensures NO committed work is left behind.
 * ════════════════════════════════════════════════════════════
 *
 * Architecture:
 *   Coding Extensions (Roo, Claude, Blackbox, Codex, etc.)
 *          │
 *          ▼
 *   Deployer Agent MCP ───▶ Queue ───▶ Execute ───▶ Report
 *          │                              │
 *          ▼                              ▼
 *   Central Brain PostgreSQL        VPS (Tailscale/Public)
 *   - deployer_locks                - git log for pending
 *   - deployer_queue                - docker compose
 *   - deployer_history [*]          - health checks
 *
 * PERSISTENCE GUARANTEE:
 *   Before deploying, the agent checks ALL commits since the last
 *   known deployment. Any work from ANY coding extension that has
 *   been committed but not yet deployed WILL be deployed.
 *
 *   Use `deployer_pending` to see what's waiting, or
 *   `deployer_deploy_pending` to deploy everything at once.
 *
 * Locks:
 *   Only one coding extension can build/deploy at a time.
 *   Others get queued with status notification.
 *
 * Connections:
 *   Primary:   Tailscale SSH  → 100.64.175.88
 *   Fallback:  Public IP SSH  → 104.248.225.250
 *   Direct:    VPS MCP        → local MCP server on VPS
 *
 * Usage:
 *   node deployer-mcp.mjs                    Run as MCP server
 *   node deployer-mcp.mjs --status           Show queue, locks, pending
 *   node deployer-mcp.mjs --deploy           Queue a full deployment
 *   node deployer-mcp.mjs --deploy-pending   Deploy ALL pending commits
 *   node deployer-mcp.mjs --queue            Show current queue
 *   node deployer-mcp.mjs --pending          Show pending commits
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_DIR = path.resolve(__dirname, '..', '..')
const EXTENSION_ID = process.env.DEPLOYER_EXTENSION_ID || `ext-${randomUUID().slice(0, 8)}`

// =============================================
// VPS CONNECTION CONFIG
// =============================================

const VPS = {
  tailscale: {
    host: '100.64.175.88',
    user: 'root',
    key: 'C:\\Users\\user\\.ssh\\id_superroo_vps',
    priority: 1,
  },
  public: {
    host: '104.248.225.250',
    user: 'root',
    key: 'C:\\Users\\user\\.ssh\\id_superroo_vps',
    priority: 2,
  },
  vpsMcpPort: 3457,
}

// Database (uses Central Brain PostgreSQL)
const DB = {
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER || 'homeu',
  password: process.env.PGPASSWORD || 'homeu_local_password',
  database: process.env.PGDATABASE || 'homeu',
}

let pgPool = null

async function getPg() {
  if (pgPool) return pgPool
  const { default: pg } = await import('pg')
  pgPool = new pg.Pool({
    connectionString: `postgresql://${DB.user}:${DB.password}@${DB.host}:${DB.port}/${DB.database}`,
    max: 5,
  })
  return pgPool
}

// =============================================
// VPS CONNECTION MANAGER
// =============================================

function getSshCommand(host, key, command) {
  // Escape properly for PowerShell
  const keyEscaped = key.replace(/\\/g, '/')
  return `ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 -i "${keyEscaped}" root@${host} "${command}"`
}

async function connectToVPS(command) {
  // Try Tailscale first, then public IP
  const connections = [VPS.tailscale, VPS.public]
  let lastError = null

  for (const conn of connections) {
    try {
      const result = execSync(getSshCommand(conn.host, conn.key, command), {
        encoding: 'utf-8',
        timeout: 30000,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      return { success: true, output: result.trim(), via: conn.host }
    } catch (err) {
      lastError = err
      console.error(`⚠️  SSH to ${conn.host} failed: ${err.message?.slice(0, 60)}`)
    }
  }

  // Try VPS MCP as last resort
  try {
    const response = await fetch(`http://localhost:${VPS.vpsMcpPort}/exec`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
      signal: AbortSignal.timeout(15000),
    })
    if (response.ok) {
      const data = await response.json()
      return { success: true, output: data.output, via: 'vps-mcp' }
    }
  } catch { /* VPS MCP not available */ }

  return { success: false, error: lastError?.message || 'All connections failed' }
}

// =============================================
// PENDING COMMITS DETECTION
// Checks ALL coding extensions' committed-but-not-deployed work.
// =============================================

/**
 * Get the last successfully deployed commit SHA from the database.
 */
async function getLastDeployedCommit() {
  const pool = await getPg()
  const result = await pool.query(
    `SELECT commit_sha FROM deployer_history
     WHERE status = 'success' OR status = 'degraded'
     ORDER BY created_at DESC LIMIT 1`
  )
  return result.rows[0]?.commit_sha || null
}

/**
 * Check the VPS for all commits that have been made since the last deployment.
 * Returns detailed info about each pending commit including author, date, message, and files changed.
 * This works across ALL coding extensions since it reads from the shared git log.
 */
async function checkPendingCommits() {
  const lastDeployed = await getLastDeployedCommit()
  
  if (!lastDeployed) {
    // No previous deployment found — check the full log
    const result = await connectToVPS(
      'cd /opt/homeu-commerce && git log --oneline -20 2>&1'
    )
    if (!result.success) {
      return { success: false, error: result.error, pending: [], lastDeployed: null }
    }
    const commits = parseGitLog(result.output)
    return {
      success: true,
      pending: commits,
      lastDeployed: null,
      note: 'No previous deployment found. Showing last 20 commits.',
    }
  }

  // Check if lastDeployed is still in the git history
  const verifyResult = await connectToVPS(
    `cd /opt/homeu-commerce && git cat-file -t ${lastDeployed} 2>&1 || true`
  )
  if (!verifyResult.success || !verifyResult.output.trim()) {
    // Commit SHA not found locally — might be a different branch
    return {
      success: false,
      error: `Last deployed commit ${lastDeployed.slice(0, 12)} not found in local git history. May have been rebased.`,
      pending: [],
      lastDeployed,
    }
  }

  // Get all commits since last deployment with full details
  const logResult = await connectToVPS(
    `cd /opt/homeu-commerce && git log ${lastDeployed}..HEAD --format="%H|%an|%ai|%s" 2>&1`
  )
  if (!logResult.success) {
    return { success: false, error: logResult.error, pending: [], lastDeployed }
  }

  const commits = parseGitLogFull(logResult.output)

  // For each commit, get the list of changed files
  for (const commit of commits) {
    const filesResult = await connectToVPS(
      `cd /opt/homeu-commerce && git diff-tree --no-commit-id -r --name-only ${commit.sha} 2>&1`
    )
    if (filesResult.success && filesResult.output.trim()) {
      commit.files = filesResult.output.split('\n').filter(f => f.trim())
    }
  }

  return { success: true, pending: commits, lastDeployed }
}

/**
 * Parse git log --oneline output into commit objects.
 */
function parseGitLog(output) {
  if (!output || !output.trim()) return []
  return output.split('\n')
    .filter(line => line.trim())
    .map(line => {
      const match = line.match(/^([a-f0-9]+)\s(.+)$/)
      if (!match) return null
      return { sha: match[1], message: match[2].trim() }
    })
    .filter(Boolean)
}

/**
 * Parse git log --format="%H|%an|%ai|%s" output into detailed commit objects.
 */
function parseGitLogFull(output) {
  if (!output || !output.trim()) return []
  return output.split('\n')
    .filter(line => line.trim())
    .map(line => {
      const parts = line.split('|')
      if (parts.length < 4) return null
      return {
        sha: parts[0],
        author: parts[1],
        date: parts[2],
        message: parts.slice(3).join('|'),
        files: [],
      }
    })
    .filter(Boolean)
}

/**
 * Get a human-readable summary of pending commits grouped by extension/author.
 */
function formatPendingSummary(pending) {
  if (!pending || pending.length === 0) return '✅ Nothing pending — all commits are deployed.'
  
  // Group by author
  const byAuthor = {}
  for (const c of pending) {
    const author = c.author || 'unknown'
    if (!byAuthor[author]) byAuthor[author] = []
    byAuthor[author].push(c)
  }

  const lines = [`📋 ${pending.length} pending commit(s) found:\n`]
  for (const [author, commits] of Object.entries(byAuthor)) {
    lines.push(`  👤 ${author}:`)
    for (const c of commits) {
      const sha = c.sha.slice(0, 8)
      const date = c.date ? c.date.slice(0, 10) : ''
      const msg = c.message.length > 60 ? c.message.slice(0, 57) + '...' : c.message
      const fileCount = c.files?.length || 0
      lines.push(`    📝 ${sha} ${date} ${msg}`)
      if (fileCount > 0) {
        lines.push(`       📄 ${fileCount} file(s) changed`)
      }
    }
    lines.push('')
  }
  lines.push(`💡 Run \`deployer_deploy_pending\` to deploy all ${pending.length} pending commit(s).`)
  return lines.join('\n')
}

// =============================================
// LOCK MANAGER (prevents duplicate runs)
// =============================================

const LOCKS = {
  BUILD: 'build',
  DEPLOY: 'deploy',
  SCAN: 'scan',
  SYNC: 'sync',
}

async function acquireLock(lockKey, timeout = 300) {
  const pool = await getPg()
  const lockId = `${lockKey}-${new Date().toISOString().slice(0, 16)}`
  
  try {
    await pool.query(
      `INSERT INTO deployer_locks (lock_key, locked_by, expires_at, status)
       VALUES ($1, $2, NOW() + INTERVAL '${timeout} seconds', 'locked')
       ON CONFLICT (lock_key) DO UPDATE
       SET locked_by = EXCLUDED.locked_by,
           expires_at = NOW() + INTERVAL '${timeout} seconds',
           status = 'locked'
       WHERE deployer_locks.expires_at < NOW()`,
      [lockKey, EXTENSION_ID]
    )
    const result = await pool.query(
      `SELECT * FROM deployer_locks WHERE lock_key = $1 AND locked_by = $2 AND status = 'locked'`,
      [lockKey, EXTENSION_ID]
    )
    if (result.rows.length > 0) {
      console.error(`🔒 Lock acquired: ${lockKey} by ${EXTENSION_ID}`)
      return true
    }
    const existing = await pool.query(
      `SELECT locked_by, expires_at FROM deployer_locks WHERE lock_key = $1 AND status = 'locked'`,
      [lockKey]
    )
    if (existing.rows.length > 0) {
      console.error(`⚠️  Lock held by: ${existing.rows[0].locked_by} (expires ${existing.rows[0].expires_at})`)
    }
    return false
  } catch (err) {
    console.error(`❌ Lock error: ${err.message}`)
    return false
  }
}

async function releaseLock(lockKey) {
  const pool = await getPg()
  await pool.query(
    `UPDATE deployer_locks SET status = 'completed' WHERE lock_key = $1 AND locked_by = $2`,
    [lockKey, EXTENSION_ID]
  )
  console.error(`🔓 Lock released: ${lockKey}`)
}

// =============================================
// QUEUE MANAGER
// =============================================

async function enqueueTask(taskType, DaVinciOS = {}, priority = 0) {
  const pool = await getPg()
  const requestId = `${taskType}-${randomUUID().slice(0, 12)}`
  
  // Check for existing similar pending task
  const existing = await pool.query(
    `SELECT id, status FROM deployer_queue 
     WHERE task_type = $1 AND status = 'queued' 
     ORDER BY created_at DESC LIMIT 1`,
    [taskType]
  )
  
  if (existing.rows.length > 0) {
    console.error(`⚠️  Task ${taskType} already queued (#${existing.rows[0].id}). Deduplicating.`)
    return { id: existing.rows[0].id, status: 'already_queued' }
  }

  const result = await pool.query(
    `INSERT INTO deployer_queue (task_type, priority, status, requested_by, request_id, DaVinciOS)
     VALUES ($1, $2, 'queued', $3, $4, $5)
     RETURNING id`,
    [taskType, priority, EXTENSION_ID, requestId, JSON.stringify(DaVinciOS)]
  )
  
  console.error(`📋 Task queued: ${taskType} (#${result.rows[0].id})`)
  return { id: result.rows[0].id, status: 'queued' }
}

async function processQueue() {
  const pool = await getPg()
  
  // Get next task (highest priority, oldest first)
  const next = await pool.query(
    `UPDATE deployer_queue SET status = 'running', started_at = NOW()
     WHERE id = (
       SELECT id FROM deployer_queue 
       WHERE status = 'queued' 
       ORDER BY priority DESC, created_at ASC 
       LIMIT 1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING *`
  )
  
  if (next.rows.length === 0) {
    return null
  }
  
  return next.rows[0]
}

// =============================================
// DEPLOYMENT EXECUTOR
// =============================================

async function executeBuild() {
  console.error('🏗️  Building...')
  const result = await connectToVPS(
    'cd /opt/homeu-commerce && docker compose build --no-cache 2>&1 | tail -5'
  )
  return result
}

async function executeDeploy() {
  console.error('🚀 Deploying...')
  
  // 1. Pull latest code
  const pull = await connectToVPS('cd /opt/homeu-commerce && git pull 2>&1')
  if (!pull.success) return pull
  
  // 2. Get the actual HEAD commit SHA after pull (this is what we're deploying)
  const headResult = await connectToVPS('cd /opt/homeu-commerce && git rev-parse HEAD 2>&1')
  const commitSha = headResult.success ? headResult.output.trim() : (pull.output.match(/[a-f0-9]{7,40}/)?.[0] || '')
  
  // 3. Build
  const build = await connectToVPS('cd /opt/homeu-commerce && docker compose build --no-cache 2>&1 | tail -5')
  if (!build.success) return build
  
  // 4. Start services
  const start = await connectToVPS('cd /opt/homeu-commerce && docker compose up -d 2>&1')
  if (!start.success) return start
  
  // 5. Health check
  const health = await connectToVPS(
    'curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/'
      + ' && echo " " && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin'
  )
  
  // 6. Record history with full commit SHA
  const pool = await getPg()
  await pool.query(
    `INSERT INTO deployer_history (commit_sha, status, docker_image, deployed_by)
     VALUES ($1, $2, 'homeu-commerce-website:latest', $3)`,
    [commitSha, health.success ? 'success' : 'degraded', EXTENSION_ID]
  )
  
  return { ...health, commitSha }
}

async function executeSync() {
  console.error('🔄 Syncing from Shopify...')
  return connectToVPS(
    'cd /opt/homeu-commerce && node tools/shopify-mcp/server.mjs --export 2>&1 | tail -10'
  )
}

async function executeScan() {
  console.error('🔍 Scanning...')
  return connectToVPS(
    'cd /opt/homeu-commerce/tools/playwright-scanner && node scan.mjs --no-screenshots --delay 500 --max-pages 50 2>&1 | tail -10'
  )
}

const EXECUTORS = {
  build: executeBuild,
  deploy: executeDeploy,
  sync: executeSync,
  scan: executeScan,
}

// =============================================
// MCP TOOLS
// =============================================

const TOOLS = [
  {
    name: 'deployer_status',
    description: 'Show deployer queue status, current locks, last deployment, and VPS connection health',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'deployer_build',
    description: 'Queue a Docker build on the VPS. Checks lock first — deduplicates if already queued.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'deployer_deploy',
    description: 'Queue a full deploy: git pull → build → restart → health check. Acquires deploy lock.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'deployer_sync',
    description: 'Queue Shopify → Central Brain data sync via MCP export',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'deployer_scan',
    description: 'Queue Playwright scan of www.homeu.ph',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'deployer_queue_list',
    description: 'List all queued, running, and recent tasks',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'deployer_vps_test',
    description: 'Test VPS connectivity (Tailscale → Public → VPS MCP)',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'deployer_health',
    description: 'Quick health check: homepage, admin panel, postgres',
    inputSchema: { type: 'object', properties: {} },
  },
  // ═══════════════════════════════════════════════════════
  // PERSISTENCE TOOLS — Ensure NO committed work is missed
  // ═══════════════════════════════════════════════════════
  {
    name: 'deployer_pending',
    description: 'Check ALL pending commits from ANY coding extension that have NOT yet been deployed. Compares git log on VPS against the last successfully deployed commit SHA in the database. Returns author, date, message, and files changed for each pending commit.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'deployer_deploy_pending',
    description: 'Deploy ALL pending commits from ANY coding extension. Checks git for un-deployed commits, then runs full deploy cycle (git pull → build → restart → health check) for everything at once. This is the recommended way to ensure no work is left behind.',
    inputSchema: { type: 'object', properties: {} },
  },
]

async function main() {
  const args = process.argv.slice(2)

  // CLI MODE
  if (args.includes('--status')) {
    try {
      const pool = await getPg()
      const locks = await pool.query('SELECT lock_key, locked_by, status, expires_at FROM deployer_locks ORDER BY lock_key')
      const queue = await pool.query("SELECT id, task_type, status, priority, requested_by, created_at FROM deployer_queue ORDER BY created_at DESC LIMIT 10")
      const history = await pool.query("SELECT commit_sha, status, created_at FROM deployer_history ORDER BY created_at DESC LIMIT 5")

      console.log('\n📊 DEPLOYER STATUS')
      console.log('═══════════════════════════')
      console.log(`Extension ID: ${EXTENSION_ID}`)
      console.log('')
      console.log('🔒 LOCKS:')
      locks.rows.forEach(l => console.log(`  ${l.lock_key}: ${l.status} by ${l.locked_by} (exp ${l.expires_at?.slice(0,19) || 'N/A'})`))
      console.log('')
      console.log('📋 QUEUE:')
      queue.rows.forEach(q => console.log(`  #${q.id} ${q.task_type} [${q.status}] ${q.requested_by} ${q.created_at?.slice(0,19)}`))
      console.log('')
      console.log('📜 HISTORY:')
      history.rows.forEach(h => console.log(`  ${h.commit_sha?.slice(0,8)} ${h.status} ${h.created_at?.slice(0,19)}`))
      console.log('')
    } catch (err) {
      console.error(`Database error: ${err.message}`)
    }
    process.exit(0)
  }

  if (args.includes('--deploy')) {
    const lock = await acquireLock(LOCKS.DEPLOY, 600)
    if (!lock) { console.error('❌ Deploy lock held by another extension. Queued.'); await enqueueTask('deploy', {}, 1); process.exit(1) }
    try {
      const task = await enqueueTask('deploy', {}, 2)
      const result = await executeDeploy()
      console.log(result.output || JSON.stringify(result))
      const pool = await getPg()
      await pool.query("UPDATE deployer_queue SET status = 'completed', result = $1 WHERE id = $2",
        [JSON.stringify(result), task.id])
    } finally { await releaseLock(LOCKS.DEPLOY) }
    process.exit(0)
  }

  if (args.includes('--queue')) {
    try {
      const pool = await getPg()
      const queue = await pool.query(
        "SELECT id, task_type, status, priority, requested_by, created_at FROM deployer_queue WHERE status != 'completed' ORDER BY priority DESC, created_at"
      )
      console.log(`\n📋 Queue (${queue.rows.length} active items):`)
      queue.rows.forEach(q => console.log(`  #${q.id} ${q.task_type.padEnd(10)} ${q.status.padEnd(10)} p${q.priority} ${q.requested_by}`))
    } catch (err) { console.error(`Error: ${err.message}`) }
    process.exit(0)
  }

  if (args.includes('--pending')) {
    try {
      const result = await checkPendingCommits()
      if (!result.success) {
        console.error(`❌ Failed to check pending commits: ${result.error}`)
        process.exit(1)
      }
      console.log('\n📋 PENDING DEPLOYMENTS')
      console.log('═══════════════════════════')
      console.log(`Last deployed: ${result.lastDeployed ? result.lastDeployed.slice(0, 12) : 'N/A'}`)
      console.log(formatPendingSummary(result.pending))
    } catch (err) { console.error(`Error: ${err.message}`) }
    process.exit(0)
  }

  if (args.includes('--deploy-pending')) {
    const lock = await acquireLock(LOCKS.DEPLOY, 600)
    if (!lock) { console.error('❌ Deploy lock held by another extension. Queued.'); await enqueueTask('deploy-pending', {}, 1); process.exit(1) }
    try {
      // Check what's pending first
      const pending = await checkPendingCommits()
      if (!pending.success) {
        console.error(`❌ Cannot check pending: ${pending.error}`)
        process.exit(1)
      }
      if (pending.pending.length === 0) {
        console.log('✅ Nothing to deploy — all commits are already deployed.')
        process.exit(0)
      }
      console.log(`📋 Deploying ${pending.pending.length} pending commit(s)...`)
      console.log(formatPendingSummary(pending.pending))
      
      const task = await enqueueTask('deploy-pending', { pendingCount: pending.pending.length, from: pending.lastDeployed }, 2)
      const result = await executeDeploy()
      console.log(result.output || JSON.stringify(result))
      const pool = await getPg()
      await pool.query("UPDATE deployer_queue SET status = 'completed', result = $1 WHERE id = $2",
        [JSON.stringify(result), task.id])
    } finally { await releaseLock(LOCKS.DEPLOY) }
    process.exit(0)
  }

  // MCP SERVER MODE
  const server = new Server(
    { name: 'homeu-deployer-agent', version: '1.0.0' },
    { capabilities: { tools: {} } }
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    try {
      switch (name) {
        case 'deployer_status': {
          let queue, locks, history
          try {
            const pool = await getPg()
            queue = (await pool.query("SELECT id, task_type, status, priority, requested_by, created_at FROM deployer_queue ORDER BY created_at DESC LIMIT 10")).rows
            locks = (await pool.query('SELECT lock_key, locked_by, status, expires_at FROM deployer_locks ORDER BY lock_key')).rows
            history = (await pool.query("SELECT commit_sha, status, created_at FROM deployer_history ORDER BY created_at DESC LIMIT 5")).rows
          } catch { queue = []; locks = []; history = [] }

          const vps = await connectToVPS('echo connected')
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                extensionId: EXTENSION_ID,
                vpsConnected: vps.success,
                vpsVia: vps.via,
                locks,
                queue,
                history,
              }, null, 2),
            }],
          }
        }

        case 'deployer_build': {
          const lock = await acquireLock(LOCKS.BUILD, 600)
          if (!lock) {
            const task = await enqueueTask('build', {}, 1)
            return { content: [{ type: 'text', text: `⚠️ Build locked by another extension. Queued as #${task.id}.` }] }
          }
          try {
            const task = await enqueueTask('build', {}, 2)
            const result = await executeBuild()
            const pool = await getPg()
            await pool.query("UPDATE deployer_queue SET status = 'completed', result = $1 WHERE id = $2",
              [JSON.stringify(result), task.id])
            return { content: [{ type: 'text', text: result.success ? `✅ Build succeeded\n${result.output}` : `❌ Build failed: ${result.error}` }] }
          } finally { await releaseLock(LOCKS.BUILD) }
        }

        case 'deployer_deploy': {
          const lock = await acquireLock(LOCKS.DEPLOY, 600)
          if (!lock) {
            const task = await enqueueTask('deploy', {}, 1)
            return { content: [{ type: 'text', text: `⚠️ Deploy locked. Queued as #${task.id}.` }] }
          }
          try {
            const task = await enqueueTask('deploy', {}, 2)
            const result = await executeDeploy()
            const pool = await getPg()
            await pool.query("UPDATE deployer_queue SET status = 'completed', result = $1 WHERE id = $2",
              [JSON.stringify(result), task.id])
            return { content: [{ type: 'text', text: result.success ? `✅ Deploy complete\n${result.output}` : `❌ Deploy failed: ${result.error}` }] }
          } finally { await releaseLock(LOCKS.DEPLOY) }
        }

        case 'deployer_sync': {
          return executeAndReport('sync', 'Sync', executeSync)
        }

        case 'deployer_scan': {
          return executeAndReport('scan', 'Scan', executeScan)
        }

        case 'deployer_queue_list': {
          const pool = await getPg()
          const items = (await pool.query(
            "SELECT id, task_type, status, priority, requested_by, created_at, started_at FROM deployer_queue WHERE status != 'completed' ORDER BY priority DESC, created_at"
          )).rows
          return { content: [{ type: 'text', text: JSON.stringify({ queue: items }, null, 2) }] }
        }

        case 'deployer_vps_test': {
          const tailscale = await connectToVPS('echo connected')
          let vpsMcp = 'unavailable'
          try {
            const resp = await fetch(`http://localhost:${VPS.vpsMcpPort}/ping`, { signal: AbortSignal.timeout(5000) })
            vpsMcp = resp.ok ? 'available' : 'error'
          } catch { /* not available */ }
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                tailscale: tailscale.success ? '✅ connected' : `❌ ${tailscale.error}`,
                tailscaleVia: tailscale.via,
                vpsMcp,
              }, null, 2),
            }],
          }
        }

        case 'deployer_health': {
          const result = await connectToVPS(
            "curl -s -o /dev/null -w 'homepage:%{http_code}' http://localhost:3000/ && echo -n ' ' && curl -s -o /dev/null -w 'admin:%{http_code}' http://localhost:3000/admin && echo -n ' ' && docker compose ps --format '{{.Name}}:{{.Status}}' 2>/dev/null"
          )
          return { content: [{ type: 'text', text: result.output || `Error: ${result.error}` }] }
        }

        // ═══════════════════════════════════════════════════════════
        // PERSISTENCE TOOL HANDLERS
        // ═══════════════════════════════════════════════════════════

        case 'deployer_pending': {
          const pending = await checkPendingCommits()
          if (!pending.success) {
            return { content: [{ type: 'text', text: `❌ Failed to check pending commits: ${pending.error}` }] }
          }
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                lastDeployed: pending.lastDeployed,
                pendingCount: pending.pending.length,
                pending: pending.pending,
                summary: formatPendingSummary(pending.pending),
              }, null, 2),
            }],
          }
        }

        case 'deployer_deploy_pending': {
          // First check what's pending
          const pendingCheck = await checkPendingCommits()
          if (!pendingCheck.success) {
            return { content: [{ type: 'text', text: `❌ Cannot check pending: ${pendingCheck.error}` }] }
          }
          if (pendingCheck.pending.length === 0) {
            return { content: [{ type: 'text', text: '✅ Nothing to deploy — all commits are already deployed.' }] }
          }

          const lock = await acquireLock(LOCKS.DEPLOY, 600)
          if (!lock) {
            const task = await enqueueTask('deploy-pending', { pendingCount: pendingCheck.pending.length }, 1)
            return { content: [{ type: 'text', text: `⚠️ Deploy locked. Queued as #${task.id} to deploy ${pendingCheck.pending.length} pending commit(s).` }] }
          }
          try {
            console.error(`📋 Deploying ${pendingCheck.pending.length} pending commit(s)...`)
            const task = await enqueueTask('deploy-pending', { pendingCount: pendingCheck.pending.length, from: pendingCheck.lastDeployed }, 2)
            const result = await executeDeploy()
            const pool = await getPg()
            await pool.query("UPDATE deployer_queue SET status = 'completed', result = $1 WHERE id = $2",
              [JSON.stringify(result), task.id])

            const response = result.success
              ? `✅ Deployed ${pendingCheck.pending.length} pending commit(s) successfully!\n${result.output}`
              : `❌ Deployment failed after ${pendingCheck.pending.length} pending commit(s): ${result.error}`
            return { content: [{ type: 'text', text: response }] }
          } finally { await releaseLock(LOCKS.DEPLOY) }
        }

        default:
          throw new Error(`Unknown tool: ${name}`)
      }
    } catch (err) {
      return { content: [{ type: 'text', text: `❌ Error: ${err.message}` }], isError: true }
    }
  })

  async function executeAndReport(taskType, label, executor) {
    const lock = await acquireLock(taskType, 600)
    if (!lock) {
      const task = await enqueueTask(taskType, {}, 1)
      return { content: [{ type: 'text', text: `⚠️ ${label} locked. Queued as #${task.id}.` }] }
    }
    try {
      const task = await enqueueTask(taskType, {}, 2)
      const result = await executor()
      const pool = await getPg()
      await pool.query("UPDATE deployer_queue SET status = 'completed', result = $1 WHERE id = $2",
        [JSON.stringify(result), task.id])
      return { content: [{ type: 'text', text: result.success ? `✅ ${label} complete\n${result.output}` : `❌ ${label} failed: ${result.error}` }] }
    } finally { await releaseLock(taskType) }
  }

  console.error(`🚀 Deployer Agent running (Extension: ${EXTENSION_ID})`)
  console.error(`   VPS: Tailscale ${VPS.tailscale.host} → Public ${VPS.public.host}`)
  console.error(`   DB:  ${DB.host}:${DB.port}/${DB.database}`)

  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
