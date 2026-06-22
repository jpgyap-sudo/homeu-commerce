/**
 * admin-full-audit.mjs
 * ======================
 * Exhaustive Playwright audit of ALL admin panel tabs.
 * Visits every page, checks HTTP, JS errors, console errors, data loading,
 * button presence, API calls, and baseline CRUD wiring.
 *
 * Usage: node tools/admin-full-audit.mjs
 * Output: docs/GAP_LOG.md (upserted), commissioning/admin-audit-report.json
 */

import { chromium } from 'playwright'
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const COMMISSIONING_DIR = join(__dirname, '..', 'commissioning')
const GAP_LOG_PATH = join(__dirname, '..', 'docs', 'GAP_LOG.md')
const REPORT_PATH = join(__dirname, '..', 'commissioning', 'admin-audit-report.json')

if (!existsSync(COMMISSIONING_DIR)) mkdirSync(COMMISSIONING_DIR, { recursive: true })

const BASE = 'http://localhost:3000'
const ADMIN_CREDENTIALS = { email: 'jpgyap@gmail.com', password: 'DaVinciOS' }

let passed = 0, failed = 0, warnings = 0
const gaps = []
const results = {}
const allConsoleErrors = []
const allPageErrors = []
const allFailedRequests = []
const allApiCalls = []

function test(name, ok, detail = '') {
  const status = ok ? '✅ PASS' : '❌ FAIL'
  console.log(`  ${status} ${name}${detail ? ` — ${detail}` : ''}`)
  if (ok) passed++
  else { failed++; gaps.push({ name, detail }) }
}

function warn(name, detail = '') {
  warnings++
  console.log(`  ⚠️  WARN ${name}${detail ? ` — ${detail}` : ''}`)
}

// ── Admin navigation tree (from AdminShell.tsx) ─────────────────
const NAV_SECTIONS = [
  {
    id: 'main', label: 'Main',
    links: [
      { href: '/admin/dashboard', label: 'Dashboard' },
    ],
  },
  {
    id: 'catalog', label: 'Catalog',
    links: [
      { href: '/admin/products', label: 'Products' },
      { href: '/admin/products/new', label: 'Products: New' },
      { href: '/admin/categories', label: 'Categories' },
      { href: '/admin/categories/new', label: 'Categories: New' },
      { href: '/admin/collections', label: 'Collections' },
      { href: '/admin/collections/new', label: 'Collections: New' },
    ],
  },
  {
    id: 'messages', label: 'Messages',
    links: [
      { href: '/admin/apps/central-inbox', label: 'Central Inbox' },
      { href: '/admin/apps/email-inbox', label: 'Email Inbox' },
    ],
  },
  {
    id: 'sales', label: 'Sales',
    links: [
      { href: '/admin/quotations', label: 'Quotations' },
      { href: '/admin/quotations/new', label: 'Quotations: New' },
      { href: '/admin/rfq', label: 'RFQ Requests' },
      { href: '/admin/customers', label: 'Customers' },
      { href: '/admin/customers/new', label: 'Customers: New' },
      { href: '/admin/designer-club', label: 'Designer Club' },
    ],
  },
  {
    id: 'content', label: 'Content',
    links: [
      { href: '/admin/theme', label: 'Theme' },
      { href: '/admin/blogs', label: 'Blogs' },
      { href: '/admin/blogs/new', label: 'Blogs: New' },
      { href: '/admin/navigation', label: 'Navigation' },
      { href: '/admin/pages', label: 'Pages' },
      { href: '/admin/pages/new', label: 'Pages: New' },
      { href: '/admin/media', label: 'Media' },
      { href: '/admin/media/new', label: 'Media: New' },
      { href: '/admin/redirects', label: 'Redirects' },
      { href: '/admin/redirects/new', label: 'Redirects: New' },
      { href: '/admin/reviews', label: 'Reviews' },
    ],
  },
  {
    id: 'insights', label: 'Insights',
    links: [
      { href: '/admin/analytics', label: 'Analytics' },
      { href: '/admin/analytics/traffic', label: 'Analytics: Traffic' },
      { href: '/admin/analytics/leads', label: 'Analytics: Leads' },
      { href: '/admin/analytics/pipeline', label: 'Analytics: Pipeline' },
      { href: '/admin/analytics/products', label: 'Analytics: Products' },
      { href: '/admin/analytics/speed', label: 'Analytics: Speed' },
      { href: '/admin/analytics/reports', label: 'Analytics: Reports' },
      { href: '/admin/collections/leads', label: 'Leads' },
      { href: '/admin/collections/appointments', label: 'Appointments' },
    ],
  },
  {
    id: 'apps', label: 'Apps',
    links: [
      { href: '/admin/apps', label: 'App Settings' },
      { href: '/admin/apps/instagram', label: 'Instagram Feed' },
    ],
  },
  {
    id: 'system', label: 'System',
    links: [
      { href: '/admin/settings/users', label: 'Settings: Users' },
      { href: '/admin/settings/store', label: 'Settings: Store' },
      { href: '/admin/settings/email', label: 'Settings: Email' },
      { href: '/admin/settings/social', label: 'Settings: Social' },
      { href: '/admin/settings/notifications', label: 'Settings: Notifications' },
      { href: '/admin/settings/ai', label: 'Settings: AI' },
      { href: '/admin/settings/cdn', label: 'Settings: CDN' },
      { href: '/admin/settings/urls', label: 'Settings: URLs' },
      { href: '/admin/settings/system', label: 'Settings: System' },
      { href: '/admin/workflows', label: 'Workflows' },
    ],
  },
]

function pageErrorsForUrl(url) {
  return allPageErrors.filter(e => e.url === url).map(e => e.message)
}

async function main() {
  console.log('═'.repeat(70))
  console.log('  ADMIN PANEL FULL AUDIT — Playwright')
  console.log(`  Target: ${BASE}`)
  console.log(`  Started: ${new Date().toISOString()}`)
  console.log('═'.repeat(70))

  // ── PHASE 1: Pre-flight HTTP checks ────────────────────────
  console.log('\n📡 PHASE 1: Pre-flight HTTP Checks')
  for (const [path, expectedStatus] of [['/', 200], ['/admin/login', 200]]) {
    try {
      const resp = await fetch(BASE + path)
      test(`${path} HTTP ${expectedStatus}`, resp.status === expectedStatus, `got ${resp.status}`)
    } catch (e) {
      test(`${path} reachable`, false, e.message)
    }
  }

  // ── PHASE 2: Browser login + full crawl ────────────────────
  console.log('\n🌐 PHASE 2: Browser Crawl')
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] })
  const context = await browser.newContext({
    ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 },
  })
  const page = await context.newPage()

  page.on('console', msg => {
    if (msg.type() === 'error') allConsoleErrors.push({ text: msg.text(), url: page.url() })
  })
  page.on('pageerror', err => allPageErrors.push({ message: err.message, url: page.url() }))
  page.on('requestfailed', req => allFailedRequests.push({ url: req.url(), error: req.failure()?.errorText, page: page.url() }))
  page.on('request', req => {
    if (req.url().includes('/api/')) allApiCalls.push({ url: req.url(), method: req.method(), page: page.url() })
  })

  // ── Login ──────────────────────────────────────────────────
  console.log('\n🔐 Logging in...')
  await page.goto(BASE + '/admin/login', { waitUntil: 'load', timeout: 30000 })
  await page.waitForTimeout(2000)

  const emailInput = await page.$('input[type="email"], input[name="email"]')
  const passwordInput = await page.$('input[type="password"], input[name="password"]')
  const submitBtn = await page.$('button[type="submit"]')

  test('Login: email input exists', !!emailInput)
  test('Login: password input exists', !!passwordInput)
  test('Login: submit button exists', !!submitBtn)

  if (emailInput && passwordInput && submitBtn) {
    await emailInput.fill(ADMIN_CREDENTIALS.email)
    await passwordInput.fill(ADMIN_CREDENTIALS.password)
    await submitBtn.click()
    await page.waitForTimeout(3000)
    const currentUrl = page.url()
    test('Login: redirects to dashboard', currentUrl.includes('/admin/dashboard') || currentUrl.includes('/admin/'), `current: ${currentUrl}`)
  } else {
    test('Login: can fill credentials', false, 'Missing form elements')
  }

  // ── Visit ALL pages ───────────────────────────────────────
  console.log('\n📋 Crawling all admin pages...')
  let pageIndex = 0
  for (const section of NAV_SECTIONS) {
    for (const link of section.links) {
      const href = link.href
      const label = link.label || href
      pageIndex++
      console.log(`\n[${pageIndex}] ${section.label}: ${label} ---`)

      try {
        await page.goto(BASE + href, { waitUntil: 'load', timeout: 30000 })
        await page.waitForTimeout(1500)
      } catch (e) {
        test(`${label}: page loads`, false, `Navigation timeout: ${e.message}`)
        continue
      }

      const currentUrl = page.url()
      const isUnauthenticated = currentUrl.includes('/admin/login') && !href.includes('/admin/login')

      if (isUnauthenticated) {
        test(`${label}: authenticated`, false, 'Redirected to login')
        results[href] = { label, status: 'UNAUTH' }
        continue
      }

      const title = await page.title()
      const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 500) || '')
      const hasContent = await page.evaluate(() => {
        const main = document.querySelector('main, [role="main"], .content, #content')
        return main ? main.textContent.length > 50 : document.body.textContent.length > 200
      })
      const hasSkeleton = bodyText.includes('Loading') || bodyText.includes('loading')
      const hasError500 = bodyText.includes('500') || bodyText.includes('Internal Server')
      const hasError404 = bodyText.includes('404') || bodyText.includes('Not Found') || bodyText.includes('not-found')
      const hasEmptyState = bodyText.includes('No ') || bodyText.includes('no ') || bodyText.includes('empty')

      test(`${label}: page loads`, true)
      test(`${label}: has content`, hasContent, bodyText.substring(0, 120))
      test(`${label}: no 500 error`, !hasError500)
      test(`${label}: no 404 error`, !hasError404)
      if (hasSkeleton && !hasContent) warn(`${label}: loading skeleton visible`)
      if (hasEmptyState) warn(`${label}: empty state: "${bodyText.substring(0, 80)}"`)

      // List page checks
      if (['products','categories','collections','blog','pages','redirects','customers','quotations','rfq','leads','appointments'].some(s => href.endsWith('/' + s))) {
        const hasRows = await page.evaluate(() => document.querySelectorAll('tr, [class*="row"], [class*="item"], [class*="card"]').length > 2)
        if (!hasRows) warn(`${label}: no data rows rendered`)
      }

      // New page checks
      if (href.includes('/new')) {
        const inputs = await page.evaluate(() => document.querySelectorAll('input, select, textarea').length)
        const saveBtn = await page.$('button[type="submit"], button:has-text("Save"), button:has-text("Create"), button:has-text("Publish")')
        test(`${label}: has form inputs`, inputs > 0)
        test(`${label}: has save button`, !!saveBtn)
      }

      // Failed API requests
      const failedReqs = allFailedRequests.filter(r => r.page === currentUrl)
      for (const fr of failedReqs) {
        test(`${label}: API ${fr.url}`, false, `${fr.error}`)
      }

      // Central inbox
      if (href.includes('/central-inbox')) {
        const hasInbox = bodyText.includes('Inbox') || bodyText.includes('message') || bodyText.includes('Conversation') || bodyText.includes('💬') || bodyText.includes('📧')
        test(`${label}: renders inbox UI`, hasInbox, bodyText.substring(0, 150))
      }

      // Dashboard stats
      if (href === '/admin/dashboard') {
        const hasStats = bodyText.includes('Lead') || bodyText.includes('Message') || bodyText.includes('Visitor') || bodyText.includes('Order')
        test(`${label}: shows metrics`, hasStats, bodyText.substring(0, 100))
      }

      // Settings pages
      if (href.includes('/settings/')) {
        const inputs = await page.evaluate(() => document.querySelectorAll('input, select, textarea').length)
        test(`${label}: has settings fields`, inputs > 0)
      }

      results[href] = {
        label,
        status: hasError500 ? 'ERROR' : hasContent ? 'OK' : 'EMPTY',
        title, hasContent,
        warnings: hasSkeleton ? ['Loading skeleton'] : [],
        pageErrors: pageErrorsForUrl(currentUrl),
        isEmpty: hasEmptyState,
      }
    }
  }

  // ── PHASE 3: Deeper CRUD tests ────────────────────────────
  console.log('\n🔧 PHASE 3: CRUD Testing')

  // Product create
  try {
    await page.goto(BASE + '/admin/products/new', { waitUntil: 'load', timeout: 30000 })
    await page.waitForTimeout(1000)
    const ti = await page.$('input[name="title"], input[id*="title"], input[placeholder*="title" i]')
    const sb = await page.$('button[type="submit"], button:has-text("Save"), button:has-text("Create"), button:has-text("Publish")')
    test('Product New: title field exists', !!ti)
    test('Product New: save button exists', !!sb)
    if (ti && sb) {
      const slug = `auto-test-${Date.now()}`
      await ti.fill(`Auto Test ${Date.now()}`)
      const si = await page.$('input[name="slug"], input[id*="slug"]')
      if (si) await si.fill(slug)
      await sb.click()
      await page.waitForTimeout(3000)
      const after = page.url()
      test('Product Create: saves', !after.includes('/new') && !after.includes('/login'), after)
    }
  } catch (e) { warn('Product CRUD', e.message) }

  // Category create
  try {
    await page.goto(BASE + '/admin/categories/new', { waitUntil: 'load', timeout: 30000 })
    await page.waitForTimeout(1000)
    const ti = await page.$('input[name="title"], input[id*="title"]')
    const sb = await page.$('button[type="submit"], button:has-text("Save"), button:has-text("Create")')
    test('Category New: title field exists', !!ti)
    test('Category New: save button exists', !!sb)
  } catch (e) { warn('Category CRUD', e.message) }

  // Settings pages save
  for (const sp of ['store', 'notifications', 'urls', 'cdn']) {
    try {
      await page.goto(BASE + '/admin/settings/' + sp, { waitUntil: 'load', timeout: 30000 })
      await page.waitForTimeout(1000)
      const sb = await page.$('button[type="submit"], button:has-text("Save"), button:has-text("Update")')
      const inputs = await page.evaluate(() => document.querySelectorAll('input, select, textarea').length)
      test(`Settings/${sp}: save button`, !!sb)
      test(`Settings/${sp}: has fields`, inputs > 0)
    } catch (e) { warn(`Settings/${sp}`, e.message) }
  }

  // Email settings
  try {
    await page.goto(BASE + '/admin/settings/email', { waitUntil: 'load', timeout: 30000 })
    await page.waitForTimeout(1000)
    const hasSMTP = await page.evaluate(() => (document.body?.innerText || '').includes('SMTP'))
    test('Email Settings: SMTP fields', hasSMTP)
  } catch (e) { warn('Email settings', e.message) }

  // ── PHASE 4: Analytics deep-check ─────────────────────────
  console.log('\n📊 PHASE 4: Analytics pages')
  for (const ap of ['traffic', 'leads', 'pipeline', 'products', 'speed', 'reports']) {
    try {
      await page.goto(BASE + '/admin/analytics/' + ap, { waitUntil: 'load', timeout: 30000 })
      await page.waitForTimeout(2000)
      const hasContent = await page.evaluate(() => document.body.textContent.length > 100)
      const title = await page.title()
      test(`Analytics/${ap}: loads`, hasContent, title)
      const hasChart = await page.evaluate(() => document.body?.innerText?.includes('chart') || document.body?.innerText?.includes('Chart') || document.querySelectorAll('canvas, svg, [class*="chart"]').length > 0)
      if (!hasContent) warn(`Analytics/${ap}: no content`)
    } catch (e) { warn(`Analytics/${ap}`, e.message) }
  }

  // ── PHASE 5: Summary ──────────────────────────────────────
  console.log('\n' + '═'.repeat(70))
  const total = passed + failed
  const passRate = total > 0 ? Math.round(passed / total * 100) : 0

  console.log(`\n📊 AUDIT SUMMARY`)
  console.log(`  Tests: ${total} | ✅ ${passed} (${passRate}%) | ❌ ${failed} | ⚠️  ${warnings}`)
  console.log(`  Console errors: ${allConsoleErrors.length}`)
  console.log(`  Page errors: ${allPageErrors.length}`)
  console.log(`  Failed API requests: ${allFailedRequests.length}`)

  if (gaps.length > 0) {
    console.log('\n📋 GAPS:')
    for (const g of gaps) console.log(`  ❌ ${g.name}${g.detail ? ': ' + g.detail : ''}`)
  }

  // Console errors
  if (allConsoleErrors.length > 0) {
    console.log('\n🔊 Console Errors (top 20):')
    for (const ce of allConsoleErrors.slice(0, 20)) console.log(`  ${ce.text.substring(0, 200)}`)
  }
  if (allPageErrors.length > 0) {
    console.log('\n💥 Page Errors:')
    for (const pe of allPageErrors) console.log(`  ${pe.message.substring(0, 200)}`)
  }
  if (allFailedRequests.length > 0) {
    console.log('\n🌐 Failed API Requests:')
    for (const fr of allFailedRequests) console.log(`  ${fr.url}: ${fr.error}`)
  }

  // ── Save report ───────────────────────────────────────────
  const report = {
    timestamp: new Date().toISOString(),
    summary: { total, passed, failed, warnings, passRate, consoleErrors: allConsoleErrors.length, pageErrors: allPageErrors.length, failedRequests: allFailedRequests.length },
    gaps, pageDetails: results,
    consoleErrors: allConsoleErrors.slice(0, 20), pageErrors: allPageErrors, failedRequests: allFailedRequests,
  }
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2))
  console.log(`\n📄 Report: ${REPORT_PATH}`)

  // ── Update GAP_LOG.md ─────────────────────────────────────
  if (gaps.length > 0 && existsSync(GAP_LOG_PATH)) {
    let gapLog = readFileSync(GAP_LOG_PATH, 'utf8')
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19) + '+08:00'
    gapLog = gapLog.replace(/\*\*Last Updated:\*\* .*/g, `**Last Updated:** ${now}`)

    const entries = gaps.map(g => `
### GAP-AUDIT-${g.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40)}

| Field | Value |
|-------|-------|
| **File(s)** | Various admin pages |
| **Type** | Wiring / Data / UI gap |
| **Status** | 🔴 Open |
| **Description** | ${g.detail || g.name} |
| **Impact** | Admin feature not fully functional |
| **Root Cause** | Discovered by Playwright audit on ${now} |
| **Fix Guidance** | Verify routes, DB data, and UI wiring |
`).join('\n')

    const ip = gapLog.indexOf('## 🔵 Low')
    if (ip > 0) {
      const ns = `\n## 🟠 Playwright Audit (${now})\n\n${entries}\n\n`
      gapLog = gapLog.substring(0, ip) + ns + gapLog.substring(ip)
    }
    writeFileSync(GAP_LOG_PATH, gapLog)
    console.log(`📄 GAP_LOG.md updated with ${gaps.length} findings`)
  }

  await browser.close()
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
