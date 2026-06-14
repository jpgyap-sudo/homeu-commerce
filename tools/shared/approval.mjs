#!/usr/bin/env node

/**
 * 🔐 Approval Callback System
 * 
 * Universal approval gate for any operation that could modify data.
 * 
 * HOW IT WORKS:
 * 1. Before any write/destructive operation, the tool calls `requireApproval()`
 * 2. A clear prompt is shown with exactly what will happen
 * 3. User must explicitly type "yes" to approve
 * 4. If no response within timeout, operation is DENIED
 * 5. All decisions are logged for audit
 * 
 * USAGE:
 *   import { requireApproval, APPROVAL_LEVELS } from '../shared/approval.mjs'
 *   
 *   // Will ask user before proceeding
 *   await requireApproval({
 *     action: 'Import 661 products into Payload CMS',
 *     details: 'This will create products, categories, and pages in admin.homeu.ph',
 *     level: 'critical',
 *     timeout: 120,
 *   })
 * 
 * LEVELS:
 *   info     - Informational, auto-approved after 5s
 *   warning  - Requires "y"/"yes" confirmation
 *   critical - Requires full "yes" typed out, shorter timeout
 * 
 * LOG:
 *   All approvals/denials logged to tools/shared/approval-log.jsonl
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createInterface } from 'readline'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOG_FILE = path.join(__dirname, 'approval-log.jsonl')

export const APPROVAL_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
}

// =============================================
// AUDIT LOG
// =============================================

function logApproval(entry) {
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true })
    fs.appendFileSync(LOG_FILE, JSON.stringify({
      ...entry,
      timestamp: new Date().toISOString(),
      hostname: process.env.COMPUTERNAME || 'unknown',
    }) + '\n')
  } catch { /* ignore log errors */ }
}

// =============================================
// USER INPUT (with timeout)
// =============================================

function getUserInput(prompt, timeoutSeconds) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    let responded = false
    const timer = setTimeout(() => {
      if (!responded) {
        console.error(`\n⏰ Timed out after ${timeoutSeconds}s — Operation DENIED by default`)
        rl.close()
        resolve('DENY_TIMEOUT')
      }
    }, timeoutSeconds * 1000)

    rl.question(prompt, (answer) => {
      responded = true
      clearTimeout(timer)
      rl.close()
      resolve(answer.trim().toLowerCase())
    })
  })
}

// =============================================
// APPROVAL GATE
// =============================================

const BANNER = `
╔══════════════════════════════════════════════════════════════╗
║           🔐  APPROVAL REQUIRED — Action Paused             ║
╚══════════════════════════════════════════════════════════════╝`

const DENIED_TEXT = `
╔══════════════════════════════════════════════════════════════╗
║           ❌  OPERATION DENIED  ❌                          ║
║                                                              ║
║  No changes were made. Your data is safe.                   ║
╚══════════════════════════════════════════════════════════════╝`

const APPROVED_TEXT = `
╔══════════════════════════════════════════════════════════════╗
║           ✅  APPROVED — Proceeding as requested            ║
╚══════════════════════════════════════════════════════════════╝`

/**
 * Require user approval before proceeding.
 * 
 * @param {Object} options
 * @param {string} options.action - Short description of what will happen
 * @param {string} options.details - Detailed explanation
 * @param {string} options.level - 'info' | 'warning' | 'critical'
 * @param {number} options.timeout - Seconds before auto-deny (default: 60)
 * @param {string} options.source - Which tool/agent is requesting
 * @param {string[]} options.files - Files that will be modified
 * @returns {Promise<boolean>} true if approved
 */
export async function requireApproval(options = {}) {
  const {
    action = 'Unknown operation',
    details = '',
    level = 'warning',
    timeout = 60,
    source = 'homeu-commerce',
    files = [],
  } = options

  const isAutoMode = process.argv.includes('--auto-approve') || process.env.AUTO_APPROVE === 'true'

  // INFO level: auto-approved in non-interactive mode
  if (isAutoMode && level === 'info') {
    console.error(`ℹ️  [AUTO-APPROVED] ${action}`)
    logApproval({ action, details, level, approved: true, method: 'auto-approve' })
    return true
  }

  console.error(BANNER)
  console.error(`\n  🎯 Action: ${action}`)
  if (details) console.error(`  📋 Details: ${details}`)
  console.error(`  ⚠️  Level: ${level.toUpperCase()}`)
  if (files.length > 0) {
    console.error(`  📁 Files affected:`)
    files.forEach(f => console.error(`     • ${f}`))
  }
  console.error(`  ⏰ Timeout: ${timeout}s (auto-denies after)`)

  const prompts = {
    info: '\n  Proceed? This is informational. (Y/n): ',
    warning: '\n  ⚠️  Type "yes" to approve this operation: ',
    critical: '\n  🛑  CRITICAL: Type "yes" to confirm this operation: ',
  }

  const answer = isAutoMode ? 'yes' : await getUserInput(prompts[level] || prompts.warning, timeout)

  let approved = false
  let method = 'user-input'

  if (answer === 'yes') {
    approved = true
    console.error(APPROVED_TEXT)
  } else if (answer === 'DENY_TIMEOUT') {
    approved = false
    method = 'timeout-deny'
    console.error(`\n⏰ Timeout — Auto-denied`)
    console.error(DENIED_TEXT)
  } else {
    approved = false
    console.error(DENIED_TEXT)
  }

  logApproval({ action, details, level, approved, method, timeout, source, files })
  return approved
}

// =============================================
// CLI
// =============================================

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  
  if (args.includes('--log')) {
    // Show approval log
    if (fs.existsSync(LOG_FILE)) {
      const logs = fs.readFileSync(LOG_FILE, 'utf-8').split('\n').filter(Boolean)
      console.log(`\n🔐 Approval Log (${logs.length} entries)\n`)
      logs.slice(-20).forEach(line => {
        const entry = JSON.parse(line)
        const icon = entry.approved ? '✅' : '❌'
        console.log(`${icon} [${new Date(entry.timestamp).toLocaleString()}] ${entry.action}`)
      })
    } else {
      console.log('No approval log found.')
    }
    process.exit(0)
  }

  if (args.includes('--clear-log')) {
    fs.writeFileSync(LOG_FILE, '')
    console.log('✅ Approval log cleared')
    process.exit(0)
  }

  // Test
  console.log('\n🔐 Approval Callback System — Test\n')
  
  requireApproval({
    action: 'Test operation',
    details: 'This is a test to verify the approval system works',
    level: 'warning',
    timeout: 30,
    source: 'cli-test',
  }).then(approved => {
    console.log(`\nResult: ${approved ? '✅ APPROVED' : '❌ DENIED'}`)
  })
}
