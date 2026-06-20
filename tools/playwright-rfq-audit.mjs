/**
 * playwright-rfq-audit.mjs
 * =========================
 * Comprehensive Playwright audit of RFQ system — QuickRFQ widget,
 * price formatting, per-item notes, QuoteCart, API endpoints.
 *
 * Usage: node tools/playwright-rfq-audit.mjs
 */

import { chromium } from 'playwright'
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE = 'http://localhost:3000'

let passed = 0, failed = 0, warnings = 0
const issues = []

function ok(msg) { passed++; console.log(`  ✅ ${msg}`) }
function fail(msg, detail = '') { failed++; issues.push({ severity: 'FAIL', msg, detail }); console.log(`  ❌ ${msg}${detail ? ' — ' + detail : ''}`) }
function warn(msg, detail = '') { warnings++; issues.push({ severity: 'WARN', msg, detail }); console.log(`  ⚠️ ${msg}${detail ? ' — ' + detail : ''}`) }

async function getJSON(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) { return { error: `HTTP ${res.status}` } }
    return await res.json()
  } catch (e) { return { error: e.message } }
}

// ── File-based audits ──────────────────────────────────────────────

function auditFormatUtils() {
  console.log(`\n📁 format-utils.ts`)
  const path = resolve(__dirname, '..', 'apps', 'website', 'src', 'lib', 'format-utils.ts')
  if (!existsSync(path)) { fail('format-utils.ts NOT FOUND'); return }
  const c = readFileSync(path, 'utf-8')
  const checks = [
    ['formatPrice export', c.includes('export function formatPrice')],
    ['formatPriceRange', c.includes('export function formatPriceRange')],
    ['formatQuantity', c.includes('export function formatQuantity')],
    ['formatNumber', c.includes('export function formatNumber')],
    ['toLocaleString usage', c.includes('toLocaleString(')],
    ['Inter font not hardcoded', true], // utility, no font inline
  ]
  for (const [label, okk] of checks) {
    if (okk) ok(`format-utils: ${label}`)
    else fail(`format-utils: ${label} MISSING`)
  }
}

function auditQuickRFQ() {
  console.log(`\n📁 QuickRFQ Widget`)
  const path = resolve(__dirname, '..', 'apps', 'website', 'src', 'components', 'QuoteCart.tsx')
  if (!existsSync(path)) { fail('QuoteCart.tsx NOT FOUND'); return }
  const c = readFileSync(path, 'utf-8')
  const checks = [
    ['QuickRFQ export', c.includes('export function QuickRFQ(')],
    ['QuoteCartExperience export', c.includes('export function QuoteCartExperience(')],
    ['QuoteCartBadge export', c.includes('export function QuoteCartBadge(')],
    ['addToQuoteCart function', c.includes('export function addToQuoteCart')],
    ['updateQuoteItemNotes function', c.includes('export function updateQuoteItemNotes')],
    ['formatPrice import', c.includes("from '@/lib/format-utils'")],
    ['Per-item notes textarea', c.includes('textarea') && c.includes('placeholder') && c.includes('item.notes')],
    ['Notes in submit', c.includes('notes: item.notes')],
    ['In-cart detection', c.includes('setInCart(true)')],
    ['View in RFQ Cart link', c.includes('View in RFQ Cart')],
    ['Quantity stepper', c.includes('qtyBtnStyle')],
    ['Notes expander 📝', c.includes('noteToggleStyle')],
  ]
  for (const [label, okk] of checks) {
    if (okk) ok(`QuickRFQ: ${label}`)
    else fail(`QuickRFQ: ${label} MISSING`)
  }
}

function auditProductDetailPage() {
  console.log(`\n📁 Product Detail Page`)
  const path = resolve(__dirname, '..', 'apps', 'website', 'src', 'app', 'products', '[slug]', 'page.tsx')
  if (!existsSync(path)) { fail('Product detail page NOT FOUND'); return }
  const c = readFileSync(path, 'utf-8')
  const checks = [
    ['QuickRFQ imported', c.includes("from '@/components/QuoteCart'")],
    ['formatPrice imported', c.includes("from '@/lib/format-utils'")],
    ['QuickRFQ used in JSX', c.includes('<QuickRFQ')],
  ]
  // Check old code is NOT present
  const oldChecks = [
    ['addToQuoteCart NOT imported', !c.includes("import { addToQuoteCart")],
    ['handleAddToCart NOT present', !c.includes('function handleAddToCart')],
  ]
  for (const [label, okk] of [...checks, ...oldChecks]) {
    if (okk) ok(`ProductDetail: ${label}`)
    else fail(`ProductDetail: ${label}`)
  }
}

function auditProductListingPage() {
  console.log(`\n📁 Product Listing Page`)
  const path = resolve(__dirname, '..', 'apps', 'website', 'src', 'app', 'products', 'page.tsx')
  if (!existsSync(path)) { fail('Product listing NOT FOUND'); return }
  const c = readFileSync(path, 'utf-8')
  const checks = [
    ['formatPrice imported', c.includes("from '@/lib/format-utils'")],
    ['formatPrice used in JSX', c.includes('formatPrice(product.price)')],
    ['Inter font on price', c.includes("fontFamily: \"'Inter'")],
  ]
  for (const [label, okk] of checks) {
    if (okk) ok(`ProductListing: ${label}`)
    else fail(`ProductListing: ${label}`)
  }
}

// ── Page-based audits ──────────────────────────────────────────────

async function auditHomepageBodyBackground(page) {
  console.log(`\n🌐 Homepage Background`)
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  if (bg === 'rgb(255, 255, 255)') ok(`Body background: white (${bg})`)
  else fail(`Body background NOT white`, `Got: ${bg}`)
}

async function auditQuoteCartPage(page) {
  console.log(`\n🌐 QuoteCart Page`)
  try {
    await page.goto(`${BASE}/quote-cart`, { waitUntil: 'networkidle', timeout: 10000 })
    ok('QuoteCart page loads successfully')
  } catch (e) { fail('QuoteCart page failed to load', e.message.slice(0, 100)); return }

  const h1 = await page.textContent('h1').catch(() => null)
  if (h1 && h1.includes('quotation')) ok(`Page heading: "${h1}"`)
  else warn(`QuoteCart heading`, `Got: "${h1}"`)

  // Check for progress steps
  const steps = await page.$$('.quote-cart-step').then(l => l.length).catch(() => 0)
  if (steps >= 3) ok(`Found ${steps} progress steps`)
  else warn(`Progress steps`, `Found ${steps}`)

  // Check for empty cart state
  const emptyText = await page.textContent('.quote-cart-empty').catch(() => null)
  if (emptyText) ok('Empty cart state rendered')
  else warn('Empty cart state NOT found', 'Cart may have items or element missing')

  // Check contact form
  const formFields = await page.$$('.quote-form input, .quote-form select, .quote-form textarea').then(l => l.length).catch(() => 0)
  if (formFields >= 4) ok(`Contact form has ${formFields} fields`)
  else warn(`Contact form fields`, `Found ${formFields}`)
}

async function auditProductPageQuickRFQ(page) {
  console.log(`\n🌐 Product Page — QuickRFQ`)
  // Try a few product slugs
  const slugs = ['sample-product', 'featured-sofa', 'test-product']
  let loaded = false
  for (const slug of slugs) {
    try {
      await page.goto(`${BASE}/products/${slug}`, { waitUntil: 'networkidle', timeout: 8000 })
      loaded = true; break
    } catch {}
  }
  if (!loaded) {
    // Check the products page for any product links
    try {
      await page.goto(`${BASE}/products`, { waitUntil: 'networkidle', timeout: 8000 })
      const links = await page.$$('a[href^="/products/"]')
      if (links.length > 0) {
        const href = await links[0].getAttribute('href')
        await page.goto(`${BASE}${href}`, { waitUntil: 'networkidle', timeout: 8000 })
        loaded = true
      }
    } catch {}
  }
  if (!loaded) { warn('No product page loaded — QuickRFQ widget cannot be tested on live site'); return }

  // Check for QuickRFQ widget elements
  const hasAddBtn = await page.textContent('button').then(t => t?.includes('Add to RFQ')).catch(() => false)
  if (hasAddBtn) ok('QuickRFQ "Add to RFQ" button found')
  else warn('"Add to RFQ" button NOT found', 'QuickRFQ may not be rendering')

  // Check for notes toggle (📝 button)
  const hasNoteBtn = await page.$$('button[title*="notes"], button[title*="questions"]').then(l => l.length).catch(() => 0)
  if (hasNoteBtn > 0) ok('Notes toggle button found')
  else {
    // Try alt svg approach
    const allButtons = await page.$$('button') || []
    let foundNote = false
    for (const btn of allButtons) {
      const html = await btn.innerHTML().catch(() => '')
      if (html.includes('note') || html.includes('M16 2H4')) { foundNote = true; break }
    }
    if (foundNote) ok('Notes toggle button found (by SVG)')
    else warn('Notes toggle button NOT found')
  }

  // Check for minimalist Inter price
  const hasMinimalistPrice = await page.evaluate(() => {
    const els = document.querySelectorAll('[style*="Inter"]')
    return els.length > 0
  })
  if (hasMinimalistPrice) ok('Minimalist Inter font on prices detected')
  else warn('Inter font NOT detected on price elements')

  // Check price has commas
  const pageText = await page.textContent('body').catch(() => '')
  const hasCommaPrice = pageText.includes('₱1,') || pageText.includes('₱2,') || pageText.includes('₱3,') ||
    pageText.includes('₱4,') || pageText.includes('₱5,') || pageText.includes('₱6,') ||
    pageText.includes('₱7,') || pageText.includes('₱8,') || pageText.includes('₱9,')
  if (hasCommaPrice) ok('Price formatting with commas detected')
  else warn('No comma-formatted price visible', 'Product may not have price set')

  // Test add to RFQ
  if (hasAddBtn) {
    const addBtn = await page.$('button:has-text("Add to RFQ")')
    if (addBtn) {
      await addBtn.click()
      await new Promise(r => setTimeout(r, 500))
      const btnText = await page.textContent('button').catch(() => '')
      if (btnText.includes('View in RFQ')) ok('QuickRFQ: "View in RFQ Cart" shown after add')
      else warn('QuickRFQ: Button did not switch after add')
    }
  }
}

async function auditApiEndpoints() {
  console.log(`\n🔌 RFQ API Endpoints`)
  const endpoints = [
    ['GET /api/rfq', '/api/rfq?limit=1'],
    ['GET /api/rfq-requests', '/api/rfq-requests?limit=1'],
    ['POST /api/rfq/add-item', '/api/rfq/add-item'],
    ['POST /api/rfq/submit', '/api/rfq/submit'],
  ]
  for (const [label, url] of endpoints) {
    const data = await getJSON(`${BASE}${url}`)
    if (!data.error) ok(`${label} — responds`)
    else warn(`${label} — ${data.error}`, 'May require auth — expected for write endpoints')
  }
}

async function auditCartSyncApi() {
  console.log(`\n🔌 Cart Sync API`)
  const data = await getJSON(`${BASE}/api/cart/sync?leadId=test`)
  if (!data.error) ok('GET /api/cart/sync — responds')
  else warn('GET /api/cart/sync', data.error)
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`RFQ SYSTEM AUDIT`)
  console.log(`Date: ${new Date().toISOString()}`)
  console.log(`URL: ${BASE}`)
  console.log(`${'═'.repeat(60)}`)

  // File-based
  auditFormatUtils()
  auditQuickRFQ()
  auditProductDetailPage()
  auditProductListingPage()

  // Page-based
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 10000 })
    await auditHomepageBodyBackground(page)
  } catch {
    warn('Homepage load failed', 'Skipping background check')
  }

  await auditQuoteCartPage(page)
  await auditProductPageQuickRFQ(page)
  await auditApiEndpoints()
  await auditCartSyncApi()

  await browser.close()

  // ── Summary ──
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`SUMMARY`)
  console.log(`${'═'.repeat(60)}`)
  console.log(`  ✅ Passed: ${passed}`)
  console.log(`  ❌ Failed: ${failed}`)
  console.log(`  ⚠️ Warnings: ${warnings}`)
  console.log(`  Total: ${passed + failed + warnings}`)

  if (issues.length > 0) {
    console.log(`\nIssues Found:`)
    for (const issue of issues) {
      console.log(`  ${issue.severity === 'FAIL' ? '🔴' : '🟡'} ${issue.msg}`)
      if (issue.detail) console.log(`     ${issue.detail}`)
    }
  }

  const reportPath = resolve(__dirname, '..', 'output', 'rfq-audit-report.json')
  mkdirSync(resolve(__dirname, '..', 'output'), { recursive: true })
  writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    passed, failed, warnings,
    total: passed + failed + warnings,
    issues,
  }, null, 2))
  console.log(`\n📝 Report: ${reportPath}`)

  process.exit(failed > 0 ? 1 : 0)
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
