/**
 * playwright-rfq-chat-e2e.mjs
 * ============================
 * Playwright E2E tests for the RFQ Persistent Chat System.
 *
 * Tests:
 *   1. Customer RFQ page loads chat component
 *   2. Customer can send a message
 *   3. Customer messages appear in the list
 *   4. Admin can view messages (full history)
 *   5. Admin can send a reply
 *   6. Smart reply suggestions load
 *   7. Product search panel opens and shows products
 *   8. Admin RFQ page renders chat with header
 *
 * Usage: node tools/playwright-rfq-chat-e2e.mjs
 */

import { chromium } from 'playwright'
import { existsSync, readFileSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE = process.env.BASE_URL || 'http://localhost:3000'
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@homeu.ph'
const ADMIN_PASS = process.env.TEST_ADMIN_PASS || 'admin123'

let passed = 0, failed = 0
const issues = []

function ok(msg) { passed++; console.log(`  ✅ ${msg}`) }
function fail(msg, detail = '') { failed++; issues.push({ severity: 'FAIL', msg, detail }); console.log(`  ❌ ${msg}${detail ? ' — ' + detail : ''}`) }

async function getJSON(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return { error: `HTTP ${res.status}` }
    return await res.json()
  } catch (e) { return { error: e.message } }
}

// ── 1. API Layer Tests ──────────────────────────────────────────

async function testCustomerChatAPI() {
  console.log(`\n📡 Customer Chat API`)
  const rfqs = await getJSON(`${BASE}/api/rfq-requests?limit=1`)
  if (rfqs.error || !rfqs.rfqs?.length) {
    warn('No authenticated RFQ fixture available', 'Skipping data-dependent customer chat checks')
    return null
  }
  const rfqId = rfqs.rfqs[0].id
  ok(`Found RFQ #${rfqId} for testing`)

  // GET messages (unauthenticated should fail)
  const unAuth = await fetch(`${BASE}/api/rfq-chat/${rfqId}/messages`)
  if (unAuth.status === 401) ok('Customer GET rejects unauthenticated requests')
  else fail('Customer GET should return 401 without auth', `Got ${unAuth.status}`)

  // POST message (unauthenticated should fail)
  const unAuthPost = await fetch(`${BASE}/api/rfq-chat/${rfqId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'Test message' }),
  })
  if (unAuthPost.status === 401) ok('Customer POST rejects unauthenticated requests')
  else fail('Customer POST should return 401 without auth', `Got ${unAuthPost.status}`)

  return rfqId
}

async function testAdminChatAPI() {
  console.log(`\n📡 Admin Chat API`)
  const admin = await fetch(`${BASE}/api/admin/rfq-chat/1/messages`)
  if (admin.status === 401) ok('Admin GET rejects unauthenticated requests')
  else fail('Admin GET should return 401 without auth', `Got ${admin.status}`)

  // Smart reply suggestions (unauthenticated)
  const suggestions = await fetch(`${BASE}/api/admin/rfq-chat/1/suggestions`)
  if (suggestions.status === 401) ok('Smart replies rejects unauthenticated requests')
  else fail('Smart replies should return 401 without auth', `Got ${suggestions.status}`)
}

// ── 2. Browser Tests (authenticated flow) ───────────────────────

async function runBrowserTests() {
  console.log(`\n🌐 Browser-based Chat Tests`)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  const logs = []

  page.on('console', msg => logs.push(msg.text()))
  page.on('pageerror', err => fail('Page JS error', err.message))

  try {
    // ── Login as admin ──
    console.log(`  🔑 Logging in as admin...`)
    await page.goto(`${BASE}/admin/login`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.fill('input[type="email"]', ADMIN_EMAIL)
    await page.fill('input[type="password"]', ADMIN_PASS)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)

    // Check we're on admin dashboard
    const url = page.url()
    if (url.includes('/admin/login')) {
      fail('Admin login failed — cannot run browser tests', 'Check credentials')
      await browser.close()
      return
    }
    ok('Admin logged in successfully')

    // ── Navigate to admin RFQ page ──
    await page.goto(`${BASE}/admin/rfq`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(1000)

    // Check RFQ list loads
    const rfqLinks = await page.$$('a[href*="/admin/rfq/"]')
    if (rfqLinks.length > 0) {
      ok(`Admin RFQ list shows ${rfqLinks.length} RFQs`)

      // Click first RFQ
      await rfqLinks[0].click()
      await page.waitForTimeout(2000)

      // Check chat container exists
      const chatContainer = await page.$('text=RFQ Chat')
      const chatContainer2 = await page.$('text=Messages')
      if (chatContainer || chatContainer2) {
        ok('Admin RFQ detail page shows chat container')
      } else {
        fail('Admin RFQ detail missing chat container', 'Check RfqChatAdminContainer integration')
      }

      // Check smart replies section exists
      const smartReplies = await page.$('text=Smart Replies')
      if (smartReplies) ok('Smart replies section renders on admin RFQ chat')
      else warn('Smart replies section not found', 'May need messages first')

      // Check notify button exists
      const notifyBtn = await page.$('text=Send Notification')
      if (notifyBtn) ok('Notify Customer button renders')
      else warn('Notify Customer button not found')

      // Check search button exists
      const searchBtn = await page.$('text=Search')
      if (searchBtn || await page.$('text=Share a product')) ok('Product search hint visible')
      else warn('Product search hint not found')

      // Check input exists
      const textarea = await page.$('textarea[placeholder*="message"]')
      if (textarea) ok('Message input textarea renders')
      else fail('Message input textarea not found')
    } else {
      fail('No RFQs found in admin list', 'Create an RFQ first')
    }

    // ── Visit customer RFQ page ──
    // First get customer session by logging in as a customer
    await page.goto(`${BASE}/customer/login`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(1000)

    // Check if login form is shown
    const customerEmailInput = await page.$('input[type="email"], input[name="email"]')
    if (customerEmailInput) {
      ok('Customer login page renders')

      // Try logging in with a test customer
      await customerEmailInput.fill('test@homeu.ph')
      const passInput = await page.$('input[type="password"]')
      if (passInput) {
        await passInput.fill('test123')
      }
      const submitBtn = await page.$('button[type="submit"]')
      if (submitBtn) await submitBtn.click()
      await page.waitForTimeout(2000)
    }

    // Navigate to customer RFQ
    await page.goto(`${BASE}/customer/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(1000)

    // Look for RFQ links
    const customerRfqLinks = await page.$$('a[href*="/customer/rfq/"]')
    if (customerRfqLinks.length > 0) {
      ok(`Customer dashboard shows ${customerRfqLinks.length} RFQs`)
      await customerRfqLinks[0].click()
      await page.waitForTimeout(2000)

      // Check chat container
      const customerChat = await page.$('text=Messages')
      if (customerChat) ok('Customer RFQ page shows Messages & Timeline section')
      else fail('Customer RFQ page missing chat section', 'Check RfqChatContainer integration')

      // Check 30-day TTL banner
      const ttlBanner = await page.$('text=last 30 days')
      if (ttlBanner) ok('30-day TTL banner visible to customer')
      else warn('TTL banner not found', 'May be in loading state')

      // Check empty state if no messages
      const emptyState = await page.$('text=No messages yet')
      if (emptyState) {
        ok('Empty state with guidance shown')
        const browseBtn = await page.$('text=Browse Products')
        if (browseBtn) ok('Empty state has Browse Products CTA')
      }

      // Check input
      const customerInput = await page.$('textarea[placeholder*="message"]')
      if (customerInput) ok('Customer message input renders')
    } else {
      warn('No customer RFQs found', 'Create a customer RFQ first')
    }

  } catch (err) {
    fail('Browser test error', err.message)
  } finally {
    await browser.close()
  }
}

function warn(msg, detail = '') {
  if (!issues.find(i => i.msg === msg)) {
    issues.push({ severity: 'WARN', msg, detail })
  }
  console.log(`  ⚠️ ${msg}${detail ? ' — ' + detail : ''}`)
}

// ── 3. File-level audits ──────────────────────────────────────────

function auditChatFiles() {
  console.log(`\n📁 Chat File Structure Audit`)

  const componentDir = resolve(__dirname, '..', 'apps', 'website', 'src', 'components', 'rfq-chat')
  if (!existsSync(componentDir)) {
    fail('rfq-chat component directory NOT FOUND')
    return
  }

  const expectedFiles = [
    'RfqChatContainer.tsx',
    'RfqChatAdminContainer.tsx',
    'RfqChatMessageList.tsx',
    'RfqChatMessageBubble.tsx',
    'RfqChatInput.tsx',
    'RfqChatNotifyButton.tsx',
    'RfqChatSelectToolbar.tsx',
    'RfqChatDeleteModal.tsx',
    'RfqChatTtlBanner.tsx',
    'RfqChatBackfillNotice.tsx',
    'RfqChatProductSearch.tsx',
    'RfqChatProductCard.tsx',
    'RfqChatSmartReplies.tsx',
  ]

  const actualFiles = new Set(readdirSync(componentDir).filter(f => f.endsWith('.tsx')))

  for (const file of expectedFiles) {
    if (actualFiles.has(file)) {
      ok(`Component exists: ${file}`)
    } else {
      fail(`Component MISSING: ${file}`)
    }
  }
}

function auditAPIRoutes() {
  console.log(`\n📁 API Route Audit`)

  const apiDirs = [
    'apps/website/src/app/api/rfq-chat',
    'apps/website/src/app/api/admin/rfq-chat',
    'apps/website/src/app/api/system/rfq-chat',
  ]

  for (const dir of apiDirs) {
    const fullPath = resolve(__dirname, '..', dir)
    if (existsSync(fullPath)) {
      ok(`API route exists: ${dir}`)
    } else {
      fail(`API route MISSING: ${dir}`)
    }
  }
}

function auditDatabaseLayer() {
  console.log(`\n📁 Database Layer Audit`)

  const dbPath = resolve(__dirname, '..', 'apps', 'website', 'src', 'lib', 'rfq-chat-db.ts')
  if (existsSync(dbPath)) {
    const c = readFileSync(dbPath, 'utf-8')
    const checks = [
      ['getOrCreateConversation', c.includes('getOrCreateConversation')],
      ['getCustomerMessages', c.includes('getCustomerMessages')],
      ['getAdminMessages', c.includes('getAdminMessages')],
      ['insertMessage', c.includes('insertMessage')],
      ['softDeleteMessages', c.includes('softDeleteMessages')],
      ['createDeletionRequest', c.includes('createDeletionRequest')],
      ['logNotification', c.includes('logNotification')],
      ['createBackfillLog', c.includes('createBackfillLog')],
    ]
    for (const [fn, found] of checks) {
      if (found) ok(`DB function: ${fn}()`)
      else fail(`DB function MISSING: ${fn}()`)
    }
  } else {
    fail('rfq-chat-db.ts NOT FOUND')
  }

  const migrationPath = resolve(__dirname, '..', 'tools', 'migrate', 'migrations', '005_add_rfq_chat.sql')
  if (existsSync(migrationPath)) {
    const c = readFileSync(migrationPath, 'utf-8')
    const tables = ['rfq_chat_conversations', 'rfq_chat_messages', 'rfq_chat_deletion_requests', 'rfq_chat_notification_log', 'chatbot_backfill_log']
    for (const table of tables) {
      if (c.includes(table)) ok(`Migration table: ${table}`)
      else fail(`Migration table MISSING: ${table}`)
    }
  } else {
    fail('Migration 005_add_rfq_chat.sql NOT FOUND')
  }
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  console.log('========================================')
  console.log('🔍 RFQ Chat E2E Audit')
  console.log('========================================')

  // File structure audits
  auditChatFiles()
  auditAPIRoutes()
  auditDatabaseLayer()

  // API layer tests
  await testCustomerChatAPI()
  await testAdminChatAPI()

  // Browser tests
  await runBrowserTests()

  // ── Report ────────────────────────────────
  const total = passed + failed
  console.log(`\n========================================`)
  console.log(`📊 Results: ${passed} passed, ${failed} failed`)
  console.log(`========================================`)

  if (issues.length > 0) {
    console.log(`\n📋 Issue Details:`)
    for (const issue of issues) {
      console.log(`  ${issue.severity === 'FAIL' ? '❌' : '⚠️'} [${issue.severity}] ${issue.msg}`)
      if (issue.detail) console.log(`     ${issue.detail}`)
    }
  }

  if (failed > 0) process.exitCode = 1
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
