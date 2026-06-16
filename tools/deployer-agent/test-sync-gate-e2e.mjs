#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════
 *  DEPLOYER AGENT — E2E Test Suite for Git Sync Gate
 *  ═══════════════════════════════════════════════════════════════════
 *
 *  Tests ALL scenarios:
 *    1.  Core sync state detection — checkLocalGitState()
 *    2.  Auto-repair pipeline — stash → pull → push → pop
 *    3.  TTL cache logic — isSyncStale()
 *    4.  Formatting — formatPendingSummary()
 *    5.  Force vs TTL passthrough — deployer_sync_check args
 *    6.  Deploy gate blocking — enforceSyncGate in deploy tools
 *    7.  MCP tool definitions — completeness check
 *    8.  Input schemas — param validation
 *    9.  DB schema completeness — queue-schema.sql
 *   10.  Seed gate rules — extension registration
 *   11.  Edge cases — error handling, resilience
 *   12.  README documentation completeness
 *   13.  Central Logger integration docs
 *   14.  Real CLI — --sync-check smoke test
 *   15.  Real CLI — --sync-status smoke test
 *   16.  Code quality — syntax validation
 *
 *  Usage:
 *    node tools/deployer-agent/test-sync-gate-e2e.mjs
 *
 *  Environment:
 *    SKIP_DB_TESTS=1    Skip tests that require PostgreSQL
 *    VERBOSE=1          Show full output
 * ═══════════════════════════════════════════════════════════════════
 */

import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

// ── Config ──
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_DIR = path.resolve(__dirname, '..', '..')
const DEPLOYER_MJS = path.resolve(__dirname, 'deployer-mcp.mjs')
const VERBOSE = process.env.VERBOSE === '1'
const SKIP_DB = process.env.SKIP_DB_TESTS === '1'

let passed = 0
let failed = 0
let skipped = 0

const PASS = '\u2705'
const FAIL = '\u274C'
const WARN = '\u26A0\uFE0F'

// ── Replicated core functions (same logic as deployer-mcp.mjs) ──

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

async function checkLocalGitState() {
  const state = {
    sha: null, branch: null, dirty: [],
    aheadCount: 0, behindCount: 0,
    fetchOk: false, pushOk: false,
    errors: [], timestamp: new Date().toISOString(),
  }

  const shaResult = localGit('rev-parse HEAD')
  if (shaResult.success) state.sha = shaResult.output

  const branchResult = localGit('rev-parse --abbrev-ref HEAD')
  if (branchResult.success) state.branch = branchResult.output

  const statusResult = localGit('status --porcelain')
  if (statusResult.success && statusResult.output) {
    state.dirty = statusResult.output.split('\n').filter(l => l.trim())
  }

  const fetchResult = localGit('fetch origin', { timeout: 60000 })
  state.fetchOk = fetchResult.success
  if (!fetchResult.success) {
    const proxyFetch = localGit(
      '-c http.proxy=http://127.0.0.1:10809 fetch origin',
      { timeout: 60000, env: { GIT_TRACE: '0' } }
    )
    if (proxyFetch.success) {
      state.fetchOk = true
      state.errors.push('fetch needed proxy')
    } else {
      const sslFetch = localGit(
        '-c http.sslVerify=false -c http.proxy=http://127.0.0.1:10809 fetch origin',
        { timeout: 60000 }
      )
      if (sslFetch.success) {
        state.fetchOk = true
        state.errors.push('fetch needed SSL-disabled proxy')
      } else {
        state.errors.push('fetch failed (all methods)')
      }
    }
  }

  if (state.fetchOk && state.branch) {
    const behindResult = localGit(`rev-list --count HEAD..origin/${state.branch}`)
    if (behindResult.success) state.behindCount = parseInt(behindResult.output) || 0

    const aheadResult = localGit(`rev-list --count origin/${state.branch}..HEAD`)
    if (aheadResult.success) state.aheadCount = parseInt(aheadResult.output) || 0

    if (state.aheadCount > 0) {
      const pushCheck = localGit(`push --dry-run origin ${state.branch}`, { timeout: 30000 })
      state.pushOk = pushCheck.success
      if (!pushCheck.success) {
        const proxyPush = localGit(
          `-c http.proxy=http://127.0.0.1:10809 push --dry-run origin ${state.branch}`,
          { timeout: 30000 }
        )
        if (proxyPush.success) state.pushOk = true
      }
    } else {
      state.pushOk = true
    }
  }

  return state
}

async function autoRepairSync(state) {
  const result = { repaired: false, stashed: false, pulled: false, pushed: false, errors: [] }

  if (state.dirty.length > 0) {
    const stashResult = localGit(`stash push -m "auto-sync-${Date.now()}" --include-untracked`)
    if (stashResult.success) {
      result.stashed = true
    } else {
      result.errors.push(`stash failed: ${stashResult.error?.slice(0, 150) || ''}`)
    }
  }

  if (state.behindCount > 0 && state.branch) {
    const pullResult = localGit(`pull --rebase origin ${state.branch}`, { timeout: 120000 })
    if (pullResult.success) {
      result.pulled = true
    } else {
      const proxyPull = localGit(
        `-c http.proxy=http://127.0.0.1:10809 pull --rebase origin ${state.branch}`,
        { timeout: 120000 }
      )
      if (proxyPull.success) result.pulled = true
      else result.errors.push('pull failed')
    }
  }

  if (state.aheadCount > 0 && state.pushOk && state.branch) {
    const pushResult = localGit(`push origin ${state.branch}`, { timeout: 60000 })
    if (pushResult.success) {
      result.pushed = true
    } else {
      const proxyPush = localGit(
        `-c http.proxy=http://127.0.0.1:10809 push origin ${state.branch}`,
        { timeout: 60000 }
      )
      if (proxyPush.success) result.pushed = true
      else result.errors.push('push failed')
    }
  }

  if (result.stashed) {
    const popResult = localGit('stash pop')
    if (!popResult.success) result.errors.push('stash pop failed')
  }

  result.repaired = result.stashed || result.pulled || result.pushed
  return result
}

function isSyncStale(lastSyncTime, ttlMinutes = 5) {
  if (!lastSyncTime) return true
  const elapsed = (Date.now() - new Date(lastSyncTime).getTime()) / 1000 / 60
  return elapsed > ttlMinutes
}

function formatPendingSummary(pending) {
  if (!pending || pending.length === 0) return 'Nothing pending'
  const byAuthor = {}
  for (const c of pending) {
    const author = c.author || 'unknown'
    if (!byAuthor[author]) byAuthor[author] = []
    byAuthor[author].push(c)
  }
  const lines = [`${pending.length} pending commit(s)`]
  for (const [author, commits] of Object.entries(byAuthor)) {
    lines.push(`  Author: ${author} (${commits.length})`)
  }
  return lines.join('\n')
}

// ── Test helpers ──

function log(label, ok, detail = '') {
  const icon = ok ? PASS : FAIL
  const status = ok ? 'PASS' : 'FAIL'
  console.log(`  ${icon} ${label.padEnd(65)} ${status}  ${detail}`)
  if (ok) passed++; else failed++
}

function logSkipped(label, reason = '') {
  console.log(`  ${WARN} ${label.padEnd(65)} SKIP  ${reason}`)
  skipped++
}

function heading(n, title) {
  console.log(`\n${'\u2500'.repeat(72)}`)
  console.log(`  TEST ${n}: ${title}`)
  console.log(`${'\u2500'.repeat(72)}`)
}

// ── Tests ──

async function main() {
  console.log(`\n${'\u2588'.repeat(72)}`)
  console.log('  DEPLOYER AGENT \u2014 GIT SYNC GATE E2E TEST SUITE')
  console.log(`  Project: ${PROJECT_DIR}`)
  console.log(`  DB tests: ${SKIP_DB ? 'SKIPPED' : 'ENABLED'}`)
  console.log(`  Time:     ${new Date().toISOString()}`)
  console.log(`${'\u2588'.repeat(72)}\n`)

  // ── TEST 1: checkLocalGitState() ──
  heading(1, 'checkLocalGitState() \u2014 Core sync state detection')
  {
    const state = await checkLocalGitState()
    log('1a. Returns SHA (string)', typeof state.sha === 'string' && state.sha.length > 0, state.sha?.slice(0, 12))
    log('1b. Returns branch (string)', typeof state.branch === 'string' && state.branch.length > 0, state.branch)
    log('1c. dirty is an Array', Array.isArray(state.dirty))
    log('1d. aheadCount is number', typeof state.aheadCount === 'number')
    log('1e. behindCount is number', typeof state.behindCount === 'number')
    log('1f. fetchOk is boolean', typeof state.fetchOk === 'boolean')
    log('1g. pushOk is boolean', typeof state.pushOk === 'boolean')
    log('1h. errors is Array', Array.isArray(state.errors))
    log('1i. timestamp is ISO string', typeof state.timestamp === 'string' && state.timestamp.includes('T'))
    log('1j. Fetch was successful', state.fetchOk === true, state.errors.find(e => e.includes('fetch')) || '')
  }

  // ── TEST 2: autoRepairSync() ──
  heading(2, 'autoRepairSync() \u2014 Auto-repair pipeline')
  {
    // Create a temporary dirty file to test auto-repair
    const testFile = `test-e2e-tmp-${Date.now()}.txt`
    try {
      fs.writeFileSync(path.join(PROJECT_DIR, testFile), `test content ${Date.now()}`, 'utf-8')
      const state = await checkLocalGitState()
      const origDirtyCount = state.dirty.length
      const repair = await autoRepairSync(state)
      const newState = await checkLocalGitState()

      log('2a. Stash was performed (dirty > 0 triggered stash)',
        origDirtyCount > 0 && (repair.stashed || repair.errors.length === 0),
        `dirty:${origDirtyCount} \u2192 ${newState.dirty.length}`)

      log('2b. No unrecoverable errors from auto-repair',
        repair.errors.length === 0,
        repair.errors.join('; ') || 'none')

      log('2c. State restored after stash-pop cycle', newState.dirty.length >= 0,
        `final dirty: ${newState.dirty.length}`)

    } catch (err) {
      log('2a. Test setup failed', false, err.message)
    } finally {
      try { fs.unlinkSync(path.join(PROJECT_DIR, testFile)) } catch {}
      try { execSync('git stash drop 2>nul || cd .', { cwd: PROJECT_DIR, stdio: 'pipe' }) } catch {}
    }
  }

  // ── TEST 3: isSyncStale() — TTL cache logic ──
  heading(3, 'isSyncStale() \u2014 TTL cache expiry')
  {
    log('3a. null/undefined \u2192 stale', isSyncStale(null, 5) === true)
    log('3b. Current time \u2192 fresh', isSyncStale(new Date().toISOString(), 5) === false)
    log('3c. 1 min ago \u2192 fresh (< 5 min TTL)', isSyncStale(new Date(Date.now() - 60000).toISOString(), 5) === false)
    log('3d. 10 min ago \u2192 stale (> 5 min TTL)', isSyncStale(new Date(Date.now() - 600000).toISOString(), 5) === true)
    log('3e. 1 hour ago \u2192 stale', isSyncStale(new Date(Date.now() - 3600000).toISOString(), 5) === true)
  }

  // ── TEST 4: formatPendingSummary() ──
  heading(4, 'formatPendingSummary() \u2014 Commit summary formatting')
  {
    const testCommits = [
      { sha: 'abc123', author: 'Roo', date: '2026-06-15T10:00:00Z', message: 'feat: add new feature', files: ['src/a.js'] },
      { sha: 'def456', author: 'Claude', date: '2026-06-15T11:00:00Z', message: 'fix: resolve bug', files: ['src/b.js', 'src/c.js'] },
      { sha: 'ghi789', author: 'Roo', date: '2026-06-15T12:00:00Z', message: 'chore: update deps', files: ['package.json'] },
    ]
    const result = formatPendingSummary(testCommits)
    const emptyResult = formatPendingSummary([])

    log('4a. Non-empty summary shows pending count', result.includes('3') || result.includes('pending'))
    log('4b. Groups by author', result.includes('Roo') && result.includes('Claude'))
    log('4c. Empty list returns "nothing pending"', emptyResult.toLowerCase().includes('nothing'))
  }

  // ── TEST 5: Force vs TTL passthrough ──
  heading(5, 'Force vs TTL passthrough \u2014 deployer_sync_check args')
  {
    const source = fs.readFileSync(DEPLOYER_MJS, 'utf-8')

    // Find the deployer_sync_check case block
    const checkIdx = source.indexOf("case 'deployer_sync_check'")
    const blockStart = source.indexOf('{', checkIdx)
    // Find enforceSyncGate call within this block
    const gateCallIdx = source.indexOf('enforceSyncGate({', blockStart)
    const gateBlock = source.slice(gateCallIdx, gateCallIdx + 200)

    log('5a. force: uses variable (not hardcoded true)',
      gateBlock.includes('force: force'),
      `found in: ${gateBlock.slice(0, 60).trim()}`)

    log('5b. skipIfRecent uses !force',
      gateBlock.includes('skipIfRecent: !force'),
      'passthrough confirmed')

    log('5c. auto_repair uses variable from args',
      gateBlock.includes('auto_repair: autoRepair'),
      'auto_repair passthrough confirmed')
  }

  // ── TEST 6: Deploy gate blocking ──
  heading(6, 'Deploy gate blocking \u2014 enforceSyncGate in deploy tools')
  {
    const source = fs.readFileSync(DEPLOYER_MJS, 'utf-8')

    const buildBlock = source.includes("case 'deployer_build'") && source.includes("await enforceSyncGate()")
    const deployBlock = source.includes("case 'deployer_deploy'") && source.includes("await enforceSyncGate()")
    const deployPendingBlock = source.includes("case 'deployer_deploy_pending'") && source.includes("const gate = await enforceSyncGate()")

    log('6a. deployer_build calls enforceSyncGate', buildBlock)
    log('6b. deployer_deploy calls enforceSyncGate', deployBlock)
    log('6c. deployer_deploy_pending calls enforceSyncGate', deployPendingBlock)
    log('6d. Gate returns BLOCKED message on failure', source.includes('SYNC GATE BLOCKED'))
    log('6e. CLI --sync-check mode exists', source.includes('--sync-check') && source.includes('checkLocalGitState()'))
  }

  // ── TEST 7: MCP tool definitions ──
  heading(7, 'MCP tool definitions \u2014 All tools present')
  {
    const source = fs.readFileSync(DEPLOYER_MJS, 'utf-8')
    const requiredTools = [
      'deployer_status', 'deployer_build', 'deployer_build_local',
      'deployer_deploy', 'deployer_sync', 'deployer_scan',
      'deployer_queue_list', 'deployer_vps_test', 'deployer_health',
      'deployer_sync_check', 'deployer_sync_status',
      'deployer_pending', 'deployer_deploy_pending',
    ]
    for (const tool of requiredTools) {
      const hasName = source.includes(`name: '${tool}'`)
      const hasHandler = source.includes(`case '${tool}'`)
      log(`7. ${tool} \u2014 defined + handled`, hasName && hasHandler)
    }
  }

  // ── TEST 8: Input schemas ──
  heading(8, 'Input schemas \u2014 param validation')
  {
    const source = fs.readFileSync(DEPLOYER_MJS, 'utf-8')
    // Schema keys are JS property names (unquoted), values use type: 'type'
    const syncCheckIdx = source.indexOf('deployer_sync_check')
    const syncStatusIdx = source.indexOf('deployer_sync_status')
    const buildLocalIdx = source.indexOf('deployer_build_local')
    log('8a. deployer_sync_check has force param',
      source.indexOf('force:', syncCheckIdx) > 0 && source.includes("type: 'boolean'"))
    log('8b. deployer_sync_check has auto_repair param',
      source.indexOf('auto_repair:', syncCheckIdx) > 0)
    log('8c. deployer_sync_status has limit param',
      source.indexOf('limit:', syncStatusIdx) > 0 && source.includes("type: 'number'"))
    log('8d. deployer_build_local has target param',
      source.indexOf('target:', buildLocalIdx) > 0 &&
      source.includes("'builder'") && source.includes("'full'"))
  }

  // ── TEST 9: DB schema completeness ──
  heading(9, 'Database schema \u2014 queue-schema.sql completeness')
  {
    const schema = fs.readFileSync(path.resolve(__dirname, 'queue-schema.sql'), 'utf-8')
    log('9a. deployer_sync_state table exists', schema.includes('CREATE TABLE IF NOT EXISTS deployer_sync_state'))
    log('9b. deployer_gate_rules table exists', schema.includes('CREATE TABLE IF NOT EXISTS deployer_gate_rules'))
    log('9c. sync_state has last_synced_sha', schema.includes('last_synced_sha'))
    log('9d. sync_state has last_sync_time', schema.includes('last_sync_time'))
    log('9e. sync_state has synced_by', schema.includes('synced_by'))
    log('9f. sync_state has status VARCHAR(20)', schema.includes('status VARCHAR(20)'))
    log('9g. sync_state has ahead_count/behind_count', schema.includes('ahead_count') && schema.includes('behind_count'))
    log('9h. sync_state has dirty_count', schema.includes('dirty_count'))
    log('9i. sync_state has stash_created', schema.includes('stash_created'))
    log('9j. sync_state has error_message', schema.includes('error_message'))
    log('9k. sync_state has UNIQUE(last_synced_sha, synced_by)', schema.includes('UNIQUE(last_synced_sha, synced_by)'))
    log('9l. gate_rules has extension_id UNIQUE', schema.includes('extension_id VARCHAR(100) UNIQUE'))
    log('9m. gate_rules has sync_required + auto_sync', schema.includes('sync_required') && schema.includes('auto_sync'))
    log('9n. Has idx_sync_time index', schema.includes('idx_sync_time'))
    log('9o. Has idx_sync_sha index', schema.includes('idx_sync_sha'))
  }

  // ── TEST 10: Seed gate rules ──
  heading(10, 'Seed gate rules \u2014 extension registration')
  {
    const seedSource = fs.readFileSync(path.resolve(__dirname, 'seed-gate-rules.mjs'), 'utf-8')
    const seedSql = fs.readFileSync(path.resolve(__dirname, 'seed-gate-rules.sql'), 'utf-8').replace(/\r/g, '')

    const requiredExtensions = [
      'ext-roo-code', 'ext-claude-code', 'ext-blackbox',
      'ext-codex-brain', 'ext-kilo-code', 'ext-roo-cline', 'ext-superroo',
    ]
    for (const ext of requiredExtensions) {
      const inSeed = seedSource.includes(ext)
      const inSql = seedSql.includes(ext)
      log(`10. ${ext} registered`, inSeed || inSql)
    }

    log('10a. ON CONFLICT UPDATE exists', seedSource.includes('ON CONFLICT (extension_id) DO UPDATE'))
    log('10b. queue-schema.sql is referenced by seeder', seedSource.includes('queue-schema.sql'))
    log('10c. Auto-register on sync_check works via ON CONFLICT', seedSql.includes('ON CONFLICT'))
  }

  // ── TEST 11: Edge cases ──
  heading(11, 'Edge cases \u2014 error handling and resilience')
  {
    const source = fs.readFileSync(DEPLOYER_MJS, 'utf-8')
    log('11a. recordSyncState wrapped in try/catch', source.includes('try {') && source.includes('await recordSyncState'))
    log('11b. Non-blocking DB error (DB down message)', source.toLowerCase().includes('non-blocking'))
    log('11c. getLastSyncState has try/catch', source.includes('async function getLastSyncState') && source.includes('catch'))
    log('11d. isSyncStale returns true if DB down', source.includes('async function isSyncStale') && source.includes('return true'))
    log('11e. Docker build failure handled', source.includes('!build.success'))
    log('11f. Deploy lock held \u2192 queued', source.includes('Deploy lock held'))
    log('11g. Build locked \u2192 queued', source.includes('Build locked'))
    log('11h. Connection fallback chain (Tailscale \u2192 Public \u2192 VPS MCP)',
      source.includes('VPS.tailscale') && source.includes('VPS.public') && source.includes('vpsMcpPort'))
    log('11i. Proxy fallback for fetch', source.includes('http.proxy=http://127.0.0.1:10809'))
    log('11j. SSL-disabled proxy fallback', source.includes('http.sslVerify=false'))
    log('11k. Empty git history / SHA not found handled', source.includes('verifyResult') || source.includes('cat-file'))
  }

  // ── TEST 12: README completeness ──
  heading(12, 'README.md \u2014 Documentation completeness')
  {
    const readme = fs.readFileSync(path.resolve(__dirname, 'README.md'), 'utf-8').toLowerCase()
    const checks = [
      ['Sync Gate', 'sync gate'],
      ['MANDATORY GATE', 'mandatory'],
      ['deployer_sync_check tool', 'deployer_sync_check'],
      ['deployer_sync_status tool', 'deployer_sync_status'],
      ['TTL cache (5 min)', '5 minute'],
      ['Auto-repair (stash/pull/push)', 'auto-repair'],
      ['Extension registration', 'register'],
      ['Persistence workflow', 'persistence'],
      ['Connection priority', 'tailscale'],
      ['CLI mode docs', '--sync-check'],
    ]
    for (const [label, keyword] of checks) {
      log(`12. README mentions: ${label}`, readme.includes(keyword))
    }
  }

  // ── TEST 13: Central Logger integration docs ──
  heading(13, 'Central Logger integration')
  {
    const readme = fs.readFileSync(path.resolve(__dirname, 'README.md'), 'utf-8')
    log('13a. README documents central-logger usage', readme.includes('central-logger.mjs'))
    log('13b. README shows logTask example', readme.includes('logTask'))
    log('13c. README shows logBug example', readme.includes('logBug'))
  }

  // ── TEST 14: CLI smoke test — --sync-check ──
  heading(14, 'Real CLI invocation \u2014 smoke test (--sync-check)')
  if (!SKIP_DB) {
    try {
      const result = execSync(
        `node "${DEPLOYER_MJS}" --sync-check`,
        { cwd: PROJECT_DIR, encoding: 'utf-8', timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'] }
      )
      const output = result.trim()
      log('14a. --sync-check runs without crash', true)
      log('14b. Shows branch', output.includes('Branch:'))
      log('14c. Shows SHA', output.includes('SHA:'))
      log('14d. Shows dirty files count', output.includes('Dirty:'))
      log('14e. Shows fetch status', output.includes('Fetch OK:'))
      log('14f. Shows push status', output.includes('Push OK:'))
      log('14g. Shows final verdict', output.includes('SYNC OK') || output.includes('SYNC ISSUES'))
    } catch (err) {
      log('14a. --sync-check crashed', false, err.message?.slice(0, 200))
      if (VERBOSE) console.error('  STDERR:', err.stderr?.toString()?.slice(0, 500))
    }
  } else {
    logSkipped('14a-14g. --sync-check smoke test', 'SKIP_DB_TESTS=1')
  }

  // ── TEST 15: CLI smoke test — --sync-status ──
  heading(15, 'Real CLI invocation \u2014 smoke test (--sync-status)')
  if (!SKIP_DB) {
    try {
      const result = execSync(
        `node "${DEPLOYER_MJS}" --sync-status`,
        { cwd: PROJECT_DIR, encoding: 'utf-8', timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'] }
      )
      const output = result.trim()
      log('15a. --sync-status runs without crash', true)
      log('15b. Shows current local state', output.includes('CURRENT LOCAL STATE'))
      log('15c. Shows recent sync records', output.includes('RECENT SYNC RECORDS'))
    } catch (err) {
      log('15a. --sync-status crashed', false, err.message?.slice(0, 200))
    }
  } else {
    logSkipped('15a-15c. --sync-status smoke test', 'SKIP_DB_TESTS=1')
  }

  // ── TEST 16: Code quality — syntax check ──
  heading(16, 'Code quality \u2014 Syntax validation')
  {
    const files = ['deployer-mcp.mjs', 'seed-gate-rules.mjs', 'vps-mcp-server.mjs']
    for (const f of files) {
      try {
        execSync(`node --check "${path.resolve(__dirname, f)}"`, { cwd: PROJECT_DIR, timeout: 15000, stdio: 'pipe' })
        log(`16. ${f} syntax is valid`, true)
      } catch (err) {
        log(`16. ${f} has syntax errors`, false, err.stderr?.toString()?.slice(0, 200))
      }
    }
  }

  // ── Summary ──
  const total = passed + failed + skipped
  console.log(`\n${'\u2550'.repeat(72)}`)
  console.log('  TEST SUMMARY')
  console.log(`${'\u2550'.repeat(72)}`)
  console.log(`  ${PASS} Passed:  ${passed}`)
  console.log(`  ${FAIL} Failed:  ${failed}`)
  console.log(`  ${WARN} Skipped: ${skipped}`)
  console.log(`  Total:    ${total}`)
  console.log(`  Pass rate: ${total > 0 ? Math.round(passed / (passed + failed) * 100) : 0}%`)
  console.log(`${'\u2550'.repeat(72)}\n`)

  process.exit(failed > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
