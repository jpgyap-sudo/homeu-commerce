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

async function enqueueTask(taskType, metadata = {}, priority = 0) {
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
    `INSERT INTO deployer_queue (task_type, priority, status, requested_by, request_id, metadata)
     VALUES ($1, $2, 'queued', $3, $4, $5)
     RETURNING id`,
    [taskType, priority, EXTENSION_ID, requestId, JSON.stringify(metadata)]
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
// GIT SYNC CHECK ENGINE
// Runs LOCAL git commands to verify local ↔ origin sync.
// Auto-repairs: stash dirty → fetch → pull → push → pop stash.
// Called as a mandatory gate before ANY deploy operation.
// =============================================

const SYNC_GATE_TTL_MINUTES = 5  // Re-check if last sync is older than this

/**
 * Run a local git command and return { success, output, error }.
 */
function localGit(args, options = {}) {
  try {
    const result = execSync(`git ${args}`, {
      cwd: PROJECT_DIR,
      encoding: 'utf-8',
      timeout: options.timeout || 30000,
      stdio: ['pipe', 'pipe', 'pipe'],
      ...(options.env ? { env: { ...process.env, ...options.env } } : {}),
    })
    return { success: true, output: result.trim() }
  } catch (err) {
    return {
      success: false,
      output: err.stdout?.toString()?.trim() || '',
      error: err.stderr?.toString()?.trim() || err.message,
    }
  }
}

/**
 * Full local git sync check — runs locally (not on VPS).
 * Returns detailed state: dirty files, ahead/behind counts, current SHA.
 */
async function checkLocalGitState() {
  const state = {
    sha: null,
    branch: null,
    dirty: [],
    aheadCount: 0,
    behindCount: 0,
    fetchOk: false,
    pushOk: false,
    errors: [],
    timestamp: new Date().toISOString(),
  }

  // 1. Get current SHA and branch
  const shaResult = localGit('rev-parse HEAD')
  if (shaResult.success) {
    state.sha = shaResult.output
  } else {
    state.errors.push(`rev-parse failed: ${shaResult.error}`)
  }

  const branchResult = localGit('rev-parse --abbrev-ref HEAD')
  if (branchResult.success) {
    state.branch = branchResult.output
  } else {
    state.errors.push(`branch detection failed: ${branchResult.error}`)
  }

  // 2. Check for dirty/uncommitted files
  const statusResult = localGit('status --porcelain')
  if (statusResult.success && statusResult.output) {
    state.dirty = statusResult.output.split('\n').filter(l => l.trim())
  }

  // 3. Fetch origin (with proxy fallback if needed)
  const fetchResult = localGit('fetch origin', { timeout: 60000 })
  state.fetchOk = fetchResult.success
  if (!fetchResult.success) {
    // Retry with HTTP proxy for Git (some networks block port 443)
    const proxyFetch = localGit(
      '-c http.proxy=http://127.0.0.1:10809 fetch origin',
      { timeout: 60000, env: { GIT_TRACE: '0' } }
    )
    if (proxyFetch.success) {
      state.fetchOk = true
      state.errors.push('fetch needed proxy fallback (http://127.0.0.1:10809)')
    } else {
      state.errors.push(`fetch failed: ${fetchResult.error}`)
      // Try with GIT_SSL_NO_VERIFY as last resort
      const sslFetch = localGit(
        '-c http.sslVerify=false -c http.proxy=http://127.0.0.1:10809 fetch origin',
        { timeout: 60000 }
      )
      if (sslFetch.success) {
        state.fetchOk = true
        state.errors.push('fetch needed SSL-disabled proxy fallback')
      } else {
        state.errors.push(`fetch failed (all methods): ${sslFetch.error?.slice(0, 200)}`)
      }
    }
  }

  // 4. Check ahead/behind counts (only if fetch succeeded)
  if (state.fetchOk && state.branch) {
    const behindResult = localGit(`rev-list --count HEAD..origin/${state.branch}`)
    if (behindResult.success) {
      state.behindCount = parseInt(behindResult.output) || 0
    }

    const aheadResult = localGit(`rev-list --count origin/${state.branch}..HEAD`)
    if (aheadResult.success) {
      state.aheadCount = parseInt(aheadResult.output) || 0
    }

    // Check if push would work (test with --dry-run)
    if (state.aheadCount > 0) {
      const pushCheck = localGit(`push --dry-run origin ${state.branch}`, { timeout: 30000 })
      state.pushOk = pushCheck.success
      if (!pushCheck.success) {
        // Retry push check with proxy
        const proxyPush = localGit(
          `-c http.proxy=http://127.0.0.1:10809 push --dry-run origin ${state.branch}`,
          { timeout: 30000 }
        )
        if (proxyPush.success) {
          state.pushOk = true
          state.errors.push('push-dry-run needed proxy')
        }
      }
    } else {
      state.pushOk = true  // nothing to push
    }
  }

  return state
}

/**
 * Auto-repair sync issues:
 * - Dirty files → stash them
 * - Behind origin → pull --rebase
 * - Ahead of origin → push
 * - Returns { repaired, stashed, pulled, pushed, errors }
 */
async function autoRepairSync(state) {
  const result = { repaired: false, stashed: false, pulled: false, pushed: false, errors: [] }
  const stashedRef = []

  // 1. Stash dirty files
  if (state.dirty.length > 0) {
    const stashResult = localGit(
      `stash push -m "auto-sync-${Date.now()}" --include-untracked`
    )
    if (stashResult.success) {
      result.stashed = true
      stashedRef.push('stash@{0}')
      console.error(`📦 Stashed ${state.dirty.length} dirty file(s)`)
    } else {
      result.errors.push(`stash failed: ${stashResult.error?.slice(0, 150)}`)
    }
  }

  // 2. Pull if behind
  if (state.behindCount > 0 && state.branch) {
    const pullResult = localGit(`pull --rebase origin ${state.branch}`, { timeout: 120000 })
    if (pullResult.success) {
      result.pulled = true
      console.error(`⬇️  Pulled ${state.behindCount} commit(s) from origin/${state.branch}`)
    } else {
      // Try pull with proxy
      const proxyPull = localGit(
        `-c http.proxy=http://127.0.0.1:10809 pull --rebase origin ${state.branch}`,
        { timeout: 120000 }
      )
      if (proxyPull.success) {
        result.pulled = true
        console.error(`⬇️  Pulled ${state.behindCount} commit(s) via proxy`)
      } else {
        result.errors.push(`pull failed: ${proxyPull.error?.slice(0, 200)}`)
      }
    }
  }

  // 3. Push if ahead
  if (state.aheadCount > 0 && state.pushOk && state.branch) {
    const pushResult = localGit(`push origin ${state.branch}`, { timeout: 60000 })
    if (pushResult.success) {
      result.pushed = true
      console.error(`⬆️  Pushed ${state.aheadCount} commit(s) to origin/${state.branch}`)
    } else {
      // Try push with proxy
      const proxyPush = localGit(
        `-c http.proxy=http://127.0.0.1:10809 push origin ${state.branch}`,
        { timeout: 60000 }
      )
      if (proxyPush.success) {
        result.pushed = true
        console.error(`⬆️  Pushed ${state.aheadCount} commit(s) via proxy`)
      } else {
        result.errors.push(`push failed: ${proxyPush.error?.slice(0, 200)}`)
      }
    }
  }

  // 4. Pop stash if we stashed anything
  if (result.stashed) {
    const popResult = localGit('stash pop')
    if (popResult.success) {
      console.error(`📦 Popped stash — dirty files restored`)
    } else {
      result.errors.push(`stash pop failed: ${popResult.error?.slice(0, 150)}`)
    }
  }

  result.repaired = result.stashed || result.pulled || result.pushed
  return result
}

/**
 * Record sync state to PostgreSQL.
 */
async function recordSyncState(state, repairResult) {
  try {
    const pool = await getPg()
    await pool.query(
      `INSERT INTO deployer_sync_state
       (last_synced_sha, synced_by, status, ahead_count, behind_count, dirty_count,
        stash_created, error_message, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        state.sha || 'unknown',
        EXTENSION_ID,
        state.errors.length > 0 ? 'error' : (state.dirty.length > 0 ? 'dirty' : 'synced'),
        state.aheadCount || 0,
        state.behindCount || 0,
        state.dirty.length || 0,
        repairResult?.stashed || false,
        state.errors.join('; ') || null,
        JSON.stringify({
          branch: state.branch,
          dirty: state.dirty,
          repair: repairResult ? {
            stashed: repairResult.stashed,
            pulled: repairResult.pulled,
            pushed: repairResult.pushed,
          } : null,
          timestamp: state.timestamp,
        }),
      ]
    )
    // Also register/update this extension in the gate rules table
    await pool.query(
      `INSERT INTO deployer_gate_rules (extension_id, extension_name, last_seen, sync_required, auto_sync)
       VALUES ($1, $2, NOW(), TRUE, TRUE)
       ON CONFLICT (extension_id) DO UPDATE SET last_seen = NOW()`,
      [EXTENSION_ID, `Extension ${EXTENSION_ID.slice(0, 12)}`]
    )
  } catch (err) {
    console.error(`⚠️  Failed to record sync state: ${err.message}`)
  }
}

/**
 * Get the last sync state from PostgreSQL.
 */
async function getLastSyncState() {
  try {
    const pool = await getPg()
    const result = await pool.query(
      `SELECT * FROM deployer_sync_state ORDER BY last_sync_time DESC LIMIT 5`
    )
    return result.rows
  } catch {
    return []
  }
}

/**
 * Check if the last sync is stale (older than SYNC_GATE_TTL_MINUTES).
 */
async function isSyncStale() {
  try {
    const pool = await getPg()
    const result = await pool.query(
      `SELECT last_sync_time FROM deployer_sync_state
       WHERE synced_by = $1
       ORDER BY last_sync_time DESC LIMIT 1`,
      [EXTENSION_ID]
    )
    if (result.rows.length === 0) return true
    const lastSync = new Date(result.rows[0].last_sync_time)
    const elapsed = (Date.now() - lastSync.getTime()) / 1000 / 60
    return elapsed > SYNC_GATE_TTL_MINUTES
  } catch {
    return true  // If we can't check, assume stale
  }
}

/**
 * ENFORCE SYNC GATE — Called by deploy/build tools before proceeding.
 * Runs full sync check + auto-repair. Returns { passed, state, repair, message }.
 * If passed=false, the calling tool MUST block the operation.
 */
async function enforceSyncGate(options = {}) {
  const force = options.force === true
  const skipIfRecent = options.skipIfRecent !== false
  const autoRepair = options.auto_repair !== false

  console.error('🔒 SYNC GATE: Checking local git state...')

  // Skip check if recent sync exists and not forced
  if (!force && skipIfRecent) {
    const stale = await isSyncStale()
    if (!stale) {
      console.error('✅ SYNC GATE: Last sync is recent (< 5 min old), skipping check')
      return { passed: true, skipped: true, message: 'Sync check skipped — last sync is still fresh.' }
    }
  }

  // Run the sync check
  const state = await checkLocalGitState()

  // Auto-repair if needed (skipped if auto_repair=false)
  let repairResult = null
  if (autoRepair && (state.dirty.length > 0 || state.behindCount > 0 || state.aheadCount > 0)) {
    repairResult = await autoRepairSync(state)

    // Re-check state after repair
    if (repairResult.repaired) {
      const newState = await checkLocalGitState()
      state.sha = newState.sha
      state.dirty = newState.dirty
      state.aheadCount = newState.aheadCount
      state.behindCount = newState.behindCount
    }
  }

  // Record to DB (best-effort — don't block if DB is down)
  try {
    await recordSyncState(state, repairResult)
  } catch (dbErr) {
    console.error(`⚠️  Sync state DB write failed (non-blocking): ${dbErr.message}`)
    state.errors.push(`DB write failed: ${dbErr.message}`)
  }

  // Determine pass/fail
  const isClean = state.dirty.length === 0 && state.behindCount === 0
  const canPush = state.aheadCount === 0 || state.pushOk
  const passed = isClean && canPush && state.fetchOk

  // Build message
  const parts = []
  if (state.dirty.length > 0) parts.push(`${state.dirty.length} dirty file(s)`)
  if (state.behindCount > 0) parts.push(`${state.behindCount} behind origin`)
  if (state.aheadCount > 0 && !state.pushOk) parts.push(`${state.aheadCount} ahead but push blocked`)
  if (!state.fetchOk) parts.push('fetch failed')
  const issues = parts.length > 0 ? ` Issues: ${parts.join(', ')}.` : ''

  const summary = passed
    ? `✅ Sync check passed — ${state.sha?.slice(0, 12)} on ${state.branch}`
    : `❌ Sync check FAILED.${issues}`

  return {
    passed,
    state,
    repair: repairResult,
    message: summary,
    sha: state.sha,
    branch: state.branch,
  }
}

// =============================================
// DEPLOYMENT EXECUTOR
// =============================================

async function executeBuild() {
  console.error('🏗️  Building...')
  const result = await connectToVPS(
    'cd /opt/homeu-commerce/apps/website && npx next build 2>&1 | tail -10'
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
  
  // 3. Build (Next.js standalone with Turbopack incremental cache)
  const build = await connectToVPS('cd /opt/homeu-commerce/apps/website && npx next build 2>&1 | tail -10')
  if (!build.success) return build

  // 4. Restart PM2 cluster (zero-downtime reload)
  const start = await connectToVPS('pm2 reload homeu-website --update-env 2>&1 || pm2 restart homeu-website')
  if (!start.success) return start
  
  // 5. Health check
  const health = await connectToVPS(
    'curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/'
      + ' && echo " " && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin'
  )
  
  // 6. Record history with full commit SHA
  const pool = await getPg()
  await pool.query(
    `INSERT INTO deployer_history (commit_sha, status, deployment_type, deployed_by)
     VALUES ($1, $2, 'pm2-cluster', $3)`,
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
    name: 'deployer_build_local',
    description: 'Run a Docker build LOCALLY (not on VPS). Uses the Build Agent for PostgreSQL-coordinated locking shared across all extensions. Supports builder-stage (default) or full image.',
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          enum: ['builder', 'full'],
          description: 'Build target: "builder" (faster, default) or "full" (production image)',
        },
      },
    },
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
  // SYNC GATE TOOLS — Local↔origin sync check (MANDATORY before deploy)
  // ═══════════════════════════════════════════════════════
  {
    name: 'deployer_sync_check',
    description: '[MANDATORY GATE] Check local git state and sync with origin before deploying. Runs LOCALLY: checks dirty files, fetches origin, computes ahead/behind, auto-repairs (stash→pull→push→pop), records to DB. ALL extensions MUST call this before deploy_deploy, deploy_deploy_pending, or deploy_build — those tools call this automatically. Use force=true to skip TTL cache.',
    inputSchema: {
      type: 'object',
      properties: {
        force: {
          type: 'boolean',
          description: 'Force re-check even if recent sync exists (< 5 min)',
        },
        auto_repair: {
          type: 'boolean',
          description: 'Auto-repair issues (stash, pull, push). Default: true',
        },
      },
    },
  },
  {
    name: 'deployer_sync_status',
    description: 'Show the last N sync check results from ALL coding extensions. Includes: last synced SHA, status (synced/dirty/behind/ahead/error), ahead/behind counts, dirty file count, timestamp, and which extension performed the check. Use this to see if any extension is out of compliance.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of recent sync records to show (default: 10)',
        },
      },
    },
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

  if (args.includes('--sync-check')) {
    (async () => {
      try {
        console.log('\n🔍 GIT SYNC CHECK\n══════════════════')
        const state = await checkLocalGitState()
        console.log(`Branch:     ${state.branch}`)
        console.log(`SHA:        ${state.sha?.slice(0, 12)}`)
        console.log(`Dirty:      ${state.dirty.length} file(s)`)
        console.log(`Ahead:      ${state.aheadCount} commit(s)`)
        console.log(`Behind:     ${state.behindCount} commit(s)`)
        console.log(`Fetch OK:   ${state.fetchOk}`)
        console.log(`Push OK:    ${state.pushOk}`)
        if (state.dirty.length > 0) {
          console.log(`\n📄 Dirty files:`)
          state.dirty.forEach(f => console.log(`  ${f}`))
        }
        if (state.errors.length > 0) {
          console.log(`\n⚠️  Warnings:`)
          state.errors.forEach(e => console.log(`  ${e}`))
        }

        let repair = null
        if (state.dirty.length > 0 || state.behindCount > 0 || state.aheadCount > 0) {
          console.log(`\n🔧 Auto-repairing...`)
          repair = await autoRepairSync(state)
          console.log(`  Stashed: ${repair.stashed}`)
          console.log(`  Pulled:  ${repair.pulled}`)
          console.log(`  Pushed:  ${repair.pushed}`)
          if (repair.errors.length > 0) {
            console.log(`  Errors:  ${repair.errors.join(', ')}`)
          }
        }

        // Persist sync state to database
        try {
          await recordSyncState(state, repair)
          console.log(`\n📝 Sync state recorded in database`)
        } catch (dbErr) {
          console.error(`\n⚠️  Could not record sync state: ${dbErr.message}`)
        }

        const isClean = state.dirty.length === 0 && state.behindCount === 0
        console.log(`\n${isClean ? '✅ SYNC OK' : '❌ SYNC ISSUES'}`)
      } catch (err) { console.error(`Error: ${err.message}`) }
      process.exit(0)
    })()
    return
  }

  if (args.includes('--sync-status')) {
    (async () => {
      try {
        console.log('\n📊 SYNC STATUS DASHBOARD\n═══════════════════════')
        const currentState = await checkLocalGitState()
        console.log(`\n📍 CURRENT LOCAL STATE:`)
        console.log(`  Branch:     ${currentState.branch}`)
        console.log(`  SHA:        ${currentState.sha?.slice(0, 12)}`)
        console.log(`  Dirty:      ${currentState.dirty.length} file(s)`)
        console.log(`  Ahead:      ${currentState.aheadCount}`)
        console.log(`  Behind:     ${currentState.behindCount}`)
        console.log(`  Fetch OK:   ${currentState.fetchOk}`)

        const records = await getLastSyncState()
        console.log(`\n📜 RECENT SYNC RECORDS (${records.length}):`)
        if (records.length === 0) {
          console.log('  (no records yet — run deployer_sync_check first)')
        }
        for (const r of records) {
          const sha = r.last_synced_sha?.slice(0, 12) || '?'
          const by = (r.synced_by || '?').slice(0, 16)
          const status = r.status || '?'
          const time = r.last_sync_time instanceof Date
            ? r.last_sync_time.toISOString().slice(0, 19).replace('T', ' ')
            : String(r.last_sync_time || '?').slice(0, 19)
          console.log(`  ${sha} ${status.padEnd(8)} by ${by.padEnd(16)} ${time}`)
          if (r.dirty_count > 0 || r.ahead_count > 0 || r.behind_count > 0) {
            console.log(`    → dirty:${r.dirty_count} ahead:${r.ahead_count} behind:${r.behind_count}`)
          }
        }
      } catch (err) { console.error(`Error: ${err.message}`) }
      process.exit(0)
    })()
    return
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
          // 🔒 SYNC GATE: Must pass sync check before building
          const gate = await enforceSyncGate()
          if (!gate.passed) {
            return { content: [{ type: 'text', text: `❌ SYNC GATE BLOCKED: ${gate.message}\n\nFix the sync issues first, then retry. Use deployer_sync_check for details.` }] }
          }
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
          // 🔒 SYNC GATE: Must pass sync check before deploying
          const gate = await enforceSyncGate()
          if (!gate.passed) {
            return { content: [{ type: 'text', text: `❌ SYNC GATE BLOCKED: ${gate.message}\n\nFix the sync issues first, then retry. Use deployer_sync_check for details.` }] }
          }
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


        case 'deployer_build_local': {
          const target = args?.target || 'builder'
          try {
            const buildAgentPath = path.resolve(PROJECT_DIR, 'tools/build-agent/build-agent.mjs')
            if (!fs.existsSync(buildAgentPath)) {
              return { content: [{ type: 'text', text: `❌ Build Agent not found at ${buildAgentPath}. Run 'npm install' in tools/build-agent/ first.` }] }
            }
            console.error('[deployer-mcp] Running local build (' + target + ') via Build Agent...')
            const buildAgentResult = execSync(
              `node "${buildAgentPath}"${target === 'full' ? ' --full' : ''}`,
              {
                cwd: PROJECT_DIR,
                encoding: 'utf-8',
                timeout: 900000,
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env, BUILD_AGENT_ID: 'deployer-mcp-' + EXTENSION_ID },
              }
            )
            try {
              const result = JSON.parse(buildAgentResult.trim())
              return {
                content: [{
                  type: 'text',
                  text: result.success
                    ? '✅ Local build succeeded (' + result.duration + 's)\nImage: ' + result.imageTag + '\n' + result.summary
                    : '❌ Local build failed\n' + result.summary,
                }],
              }
            } catch {
              return { content: [{ type: 'text', text: '✅ Local build output:\n' + buildAgentResult.trim() }] }
            }
          } catch (err) {
            return { content: [{ type: 'text', text: '❌ Local build error: ' + (err.message?.slice(0, 500) || '') }] }
          }
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
            "curl -s -o /dev/null -w 'homepage:%{http_code}' http://localhost:3000/ && echo -n ' ' && curl -s -o /dev/null -w 'admin:%{http_code}' http://localhost:3000/admin && echo -n ' ' && pm2 show homeu-website 2>/dev/null | grep 'online\\|status' | head -2"
          )
          return { content: [{ type: 'text', text: result.output || `Error: ${result.error}` }] }
        }

        // ═══════════════════════════════════════════════════════════
        // SYNC GATE TOOL HANDLERS
        // ═══════════════════════════════════════════════════════════

        case 'deployer_sync_check': {
          const force = args?.force === true
          const autoRepair = args?.auto_repair !== false
          console.error(`🔍 Running sync check (force=${force}, auto_repair=${autoRepair})...`)

          // Run the gate (includes sync check + optional auto-repair)
          // Respect the force flag from user input — if not forced and a recent
          // sync exists (< 5 min), the TTL cache is used to skip re-checking.
          const gateResult = await enforceSyncGate({
            force: force,
            skipIfRecent: !force,
            auto_repair: autoRepair,
          })

          // Use state from gate result (already re-checked after repair)
          const finalState = gateResult.state

          const response = {
            passed: gateResult.passed,
            sha: finalState.sha?.slice(0, 12) || 'unknown',
            branch: finalState.branch || 'unknown',
            message: gateResult.message,
            details: {
              dirtyFiles: finalState.dirty.length,
              dirtyList: finalState.dirty.slice(0, 20),
              aheadCount: finalState.aheadCount,
              behindCount: finalState.behindCount,
              fetchOk: finalState.fetchOk,
              pushOk: finalState.pushOk,
            },
            autoRepair: gateResult.repair ? {
              stashed: gateResult.repair.stashed,
              pulled: gateResult.repair.pulled,
              pushed: gateResult.repair.pushed,
            } : null,
            errors: finalState.errors,
            timestamp: finalState.timestamp,
          }

          // If not passed and has errors, provide guidance
          if (!gateResult.passed) {
            response.guidance = [
              '🔧 To fix:',
              finalState.dirty.length > 0 ? '  • Commit or stash your dirty files' : null,
              finalState.behindCount > 0 ? '  • Run `git pull --rebase` to catch up with origin' : null,
              !finalState.fetchOk ? '  • Check your network/proxy settings (try: git -c http.proxy=http://127.0.0.1:10809 fetch)' : null,
              finalState.aheadCount > 0 && !finalState.pushOk ? '  • Run `git push` or check your credentials' : null,
              '  • Then call deployer_sync_check again',
            ].filter(Boolean).join('\n')
          }

          return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] }
        }

        case 'deployer_sync_status': {
          const limit = args?.limit || 10
          const records = await getLastSyncState()
          const recentRecords = records.slice(0, Math.min(limit, 50))

          // Also check current local state for comparison
          const currentState = await checkLocalGitState()

          const response = {
            currentLocal: {
              sha: currentState.sha?.slice(0, 12) || 'unknown',
              branch: currentState.branch || 'unknown',
              dirtyFiles: currentState.dirty.length,
              aheadCount: currentState.aheadCount,
              behindCount: currentState.behindCount,
              fetchOk: currentState.fetchOk,
            },
            recentSyncRecords: recentRecords.map(r => ({
              sha: r.last_synced_sha?.slice(0, 12),
              syncedBy: r.synced_by?.slice(0, 16),
              status: r.status,
              aheadCount: r.ahead_count,
              behindCount: r.behind_count,
              dirtyCount: r.dirty_count,
              stashCreated: r.stash_created,
              time: r.last_sync_time,
              error: r.error_message,
            })),
            summary: currentState.dirty.length > 0 || currentState.behindCount > 0
              ? '⚠️  Local state is out of sync — run deployer_sync_check'
              : currentState.aheadCount > 0 && !currentState.fetchOk
                ? '⚠️  Local has unpushed commits and fetch failed'
                : '✅ Local state is clean and in sync',
          }

          return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] }
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
          // 🔒 SYNC GATE: Must pass sync check before deploying pending commits
          const gate = await enforceSyncGate()
          if (!gate.passed) {
            return { content: [{ type: 'text', text: `❌ SYNC GATE BLOCKED: ${gate.message}\n\nFix the sync issues first, then retry. Use deployer_sync_check for details.` }] }
          }

          // Then check what's pending on VPS
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
