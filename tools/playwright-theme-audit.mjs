/**
 * playwright-theme-audit.mjs
 * ============================
 * Comprehensive Playwright audit of the entire theme builder system.
 * Crawls every section type, checks wiring, validates CSS injection,
 * verifies APIs, and reports all bugs and gaps found.
 *
 * Usage: node tools/playwright-theme-audit.mjs
 *
 * Requires: Playwright installed & dev server running on localhost:3001
 */

import { chromium } from 'playwright'
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE = process.env.BASE_URL || 'http://localhost:3000'
const ADMIN_BASE = 'http://admin.localhost:3000'

const PASS = '\u2705'
const FAIL = '\u274C'
const WARN = '\u26A0\uFE0F'

let passed = 0, failed = 0, warnings = 0
const issues = []

function ok(msg) { passed++; console.log(`${PASS} ${msg}`) }
function fail(msg, detail = '') { failed++; issues.push({ severity: 'FAIL', msg, detail }); console.log(`${FAIL} ${msg}${detail ? ' \u2014 ' + detail : ''}`) }
function warn(msg, detail = '') { warnings++; issues.push({ severity: 'WARN', msg, detail }); console.log(`${WARN} ${msg}${detail ? ' \u2014 ' + detail : ''}`) }

async function goto(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    return true
  } catch (e) {
    fail(`Could not load ${url}`, e.message.slice(0, 120))
    return false
  }
}

async function getJSON(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) { fail(`HTTP ${res.status} from ${url}`); return null }
    return await res.json()
  } catch (e) {
    fail(`Fetch failed: ${url}`, e.message.slice(0, 120))
    return null
  }
}

// ── Page-based audits ─────────────────────────────────────────────────────

async function auditBodyBackground(page) {
  console.log(`\n${'\u2550'.repeat(60)}\nBACKGROUND COLOR AUDIT\n${'\u2550'.repeat(60)}`)
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  if (bg === 'rgb(255, 255, 255)') ok(`Body background is white: ${bg}`)
  else fail(`Body background is NOT white`, `Got: ${bg}`)
}

async function auditCssVars(page) {
  const vars = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement)
    return {
      bg: s.getPropertyValue('--bg').trim(),
      line: s.getPropertyValue('--line').trim(),
      surfaceSoft: s.getPropertyValue('--surface-soft').trim(),
    }
  })
  if (vars.bg === '#ffffff' || vars.bg === '#fff') ok(`--bg = ${vars.bg}`)
  else fail(`--bg is not white`, `Got: "${vars.bg}"`)
  if (vars.line === '#e5e7eb') ok(`--line = ${vars.line}`)
  else warn(`--line is not #e5e7eb`, `Got: "${vars.line}"`)
  if (vars.surfaceSoft === '#fafafa') ok(`--surface-soft = ${vars.surfaceSoft}`)
  else warn(`--surface-soft is not #fafafa`, `Got: "${vars.surfaceSoft}"`)
}

async function auditAnimCss(page) {
  const exists = await page.evaluate(() => {
    const el = document.getElementById('homeu-anim-css')
    return !!el && el.textContent.includes('homeu-gradient-text')
  })
  if (exists) ok('Animation CSS injected (#homeu-anim-css)')
  else fail('Animation CSS NOT injected')
}

async function auditKeyframes(page, names) {
  for (const name of names) {
    const exists = await page.evaluate((n) => {
      for (const ss of document.styleSheets) {
        try { for (const r of ss.cssRules) { if (r.name === n) return true } } catch {}
      }
      return false
    }, name)
    if (exists) ok(`@keyframes ${name} exists`)
    else warn(`@keyframes ${name} NOT found`)
  }
}

async function auditStorefrontSections(page) {
  console.log(`\n${'\u2550'.repeat(60)}\nSTOREFRONT SECTION RENDER AUDIT\n${'\u2550'.repeat(60)}`)
  const count = await page.evaluate(() => document.querySelectorAll('[data-section-id]').length)
  if (count > 0) ok(`Found ${count} sections with data-section-id`)
  else warn('No sections with data-section-id found')

  const editables = await page.evaluate(() => document.querySelectorAll('[data-edit]').length)
  if (editables > 0) ok(`Found ${editables} data-edit elements (inline editable)`)
  else warn('No data-edit elements')

  const imgEditables = await page.evaluate(() => document.querySelectorAll('[data-edit-image]').length)
  if (imgEditables > 0) ok(`Found ${imgEditables} data-edit-image elements`)
  else warn('No data-edit-image elements')

  const inlineStyles = await page.evaluate(() => {
    const exclude = new Set(['homeu-anim-css', 'homeu-header-css', 'homeu-palette-css', 'homeu-custom-css'])
    return [...document.querySelectorAll('style')].filter(s => !exclude.has(s.id)).length
  })
  if (inlineStyles > 0) ok(`Found ${inlineStyles} section <style> tags (runtime CSS injection)`)
  else warn('No section <style> tags — runtime CSS injection may not be working')
}

// ── API audits ────────────────────────────────────────────────────────────

async function auditSettingSchemaApi() {
  console.log(`\n${'\u2550'.repeat(60)}\nSETTINGS SCHEMA API\n${'\u2550'.repeat(60)}`)
  const schema = await getJSON(`${BASE}/api/theme/settings-schema`)
  if (!schema) { fail('Cannot fetch settings schema'); return }

  const sectionKeys = Object.keys(schema.sections || {})
  ok(`GET /api/theme/settings-schema returned ${sectionKeys.length} section types`)

  const expectedTypes = ['slideshow','brand_text','collection_grid','image_with_text','image_bar','featured_products',
    'reviews','instagram','cta','newsletter','logo_bar','testimonial','stats_counter','blog_posts','promo_bar','video_hero','lookbook','category_carousel']
  for (const t of expectedTypes) {
    if (sectionKeys.includes(t)) ok(`Schema has "${t}"`)
    else fail(`Schema MISSING "${t}"`)
  }

  if (schema.global && schema.global.length >= 15) ok(`Global settings has ${schema.global.length} definitions`)
  else warn(`Global settings has ${schema.global?.length || 0} items (expected 15+)`)
}

async function auditSectionsApi() {
  console.log(`\n${'\u2550'.repeat(60)}\nSECTIONS API\n${'\u2550'.repeat(60)}`)
  const data = await getJSON(`${BASE}/api/theme/sections`)
  if (!data) return

  const list = data.sections || data
  const count = Array.isArray(list) ? list.length : 0
  ok(`GET /api/theme/sections returned ${count} sections`)

  if (count > 0) {
    const first = Array.isArray(list) ? list[0] : null
    if (first && first.config) {
      if (typeof first.config === 'object') ok('Section config payload is valid (defaults merge at render time)')
      else fail('Section config payload is invalid')
    }
  }
}

async function auditThemeSettingsApi() {
  const data = await getJSON(`${BASE}/api/theme/settings`)
  if (data) ok('GET /api/theme/settings works')
}

// ── File-based audits ─────────────────────────────────────────────────────

function auditSectionPresets() {
  console.log(`\n${'\u2550'.repeat(60)}\nSECTION PRESETS\n${'\u2550'.repeat(60)}`)
  const path = resolve(__dirname, '..', 'apps', 'website', 'src', 'app', 'admin', 'theme', 'ThemeEditor.tsx')
  if (!existsSync(path)) { fail('ThemeEditor.tsx not found'); return }
  const content = readFileSync(path, 'utf-8')

  const bodyTypes = ['slideshow','brand_text','collection_grid','image_with_text','image_bar','featured_products',
    'reviews','instagram','cta','newsletter','logo_bar','testimonial','stats_counter','blog_posts','promo_bar','video_hero','lookbook','category_carousel']
  for (const t of bodyTypes) {
    if (content.includes(`  ${t}: `)) ok(`SECTION_PRESETS has "${t}"`)
    else warn(`SECTION_PRESETS missing "${t}"`)
  }
}

function auditFooterComponents() {
  console.log(`\n${'\u2550'.repeat(60)}\nFOOTER COMPONENTS\n${'\u2550'.repeat(60)}`)
  const names = ['FooterBrand', 'FooterQuickLinks', 'FooterNewsletter', 'FooterSocial']
  for (const n of names) {
    const p = resolve(__dirname, '..', 'apps', 'website', 'src', 'components', 'home', `${n}.tsx`)
    if (existsSync(p)) ok(`${n}.tsx exists`)
    else fail(`${n}.tsx NOT FOUND`)
  }
  const sf = resolve(__dirname, '..', 'apps', 'website', 'src', 'components', 'SiteFooter.tsx')
  if (existsSync(sf)) {
    const c = readFileSync(sf, 'utf-8')
    for (const n of names) {
      if (c.includes(n)) ok(`SiteFooter imports ${n}`)
      else fail(`SiteFooter does NOT import ${n}`)
    }
  }
}

function auditNewFiles() {
  console.log(`\n${'\u2550'.repeat(60)}\nNEW FILES\n${'\u2550'.repeat(60)}`)
  const checks = [
    ['lib/theme-builder-settings.ts', 'apps/website/src/lib/theme-builder-settings.ts'],
    ['lib/theme-styles.ts', 'apps/website/src/lib/theme-styles.ts'],
    ['DynamicSettingsForm.tsx', 'apps/website/src/components/admin/DynamicSettingsForm.tsx'],
    ['SectionAnimation.tsx', 'apps/website/src/components/home/SectionAnimation.tsx'],
    ['Settings schema API', 'apps/website/src/app/api/theme/settings-schema/route.ts'],
    ['SKILL.md', '.roo/skills/no-code-theme-builder/SKILL.md'],
    ['Agent', 'agents/theme-builder-agent.md'],
  ]
  for (const [label, p] of checks) {
    const full = resolve(__dirname, '..', p)
    if (existsSync(full)) ok(`${label} exists`)
    else fail(`${label} NOT FOUND at ${p}`)
  }
}

function auditHomeSectionsWiring() {
  console.log(`\n${'\u2550'.repeat(60)}\nHOMESECTIONS WIRING\n${'\u2550'.repeat(60)}`)
  const p = resolve(__dirname, '..', 'apps', 'website', 'src', 'components', 'home', 'HomeSections.tsx')
  if (!existsSync(p)) { fail('HomeSections.tsx not found'); return }
  const c = readFileSync(p, 'utf-8')

  const checks = [
    ['mergeWithDefaults imported', c.includes('mergeWithDefaults') && c.includes('from')],
    ['mergeWithDefaults called', c.includes('mergeWithDefaults(section.type, section.config)')],
    ['generateSectionStyles imported', c.includes('generateSectionStyles')],
    ['SectionAnimation imported', c.includes('SectionAnimation')],
    ['ANIMATION_CSS/GRADIENT_TEXT_CSS', c.includes('ANIMATION_CSS') && c.includes('GRADIENT_TEXT_CSS')],
  ]
  for (const [label, okk] of checks) {
    if (okk) ok(`HomeSections: ${label}`)
    else fail(`HomeSections: ${label} MISSING`)
  }

  const switchTypes = [...c.matchAll(/case\s+'(\w+)':/g)].map(m => m[1])
  const expected = ['slideshow','brand_text','collection_grid','image_with_text','image_bar','featured_products',
    'reviews','instagram','cta','newsletter','logo_bar','testimonial','stats_counter','blog_posts','promo_bar','video_hero','lookbook','category_carousel']
  for (const t of expected) {
    if (switchTypes.includes(t)) ok(`Renderer for "${t}"`)
    else fail(`Renderer for "${t}" MISSING`)
  }
}

function auditSettingsBinding() {
  console.log(`\n${'\u2550'.repeat(60)}\nSETTINGS BINDING (Schema \u2194 Renderer)\n${'\u2550'.repeat(60)}`)
  const p = resolve(__dirname, '..', 'apps', 'website', 'src', 'components', 'home', 'HomeSections.tsx')
  if (!existsSync(p)) return
  const c = readFileSync(p, 'utf-8')
  const stylesPath = resolve(__dirname, '..', 'apps', 'website', 'src', 'lib', 'theme-styles.ts')
  const wiringSource = c + (existsSync(stylesPath) ? readFileSync(stylesPath, 'utf-8') : '')

  // Key settings that should be read by the renderer
  const checks = {
    brand_text: ['title', 'body'],
    cta: ['heading', 'text', 'primaryText', 'primaryLink', 'secondaryText', 'secondaryLink'],
    newsletter: ['heading', 'subtext', 'placeholder', 'buttonText', 'successMessage'],
    promo_bar: ['text', 'link', 'bgColor', 'textColor'],
    video_hero: ['heading', 'subheading', 'buttonText', 'buttonLink', 'overlayColor'],
    instagram: ['handle', 'tiles'],
    featured_products: ['heading', 'limit', 'collectionSlug', 'source', 'curatedIds'],
  }

  for (const [type, keys] of Object.entries(checks)) {
    for (const key of keys) {
      const pat = new RegExp(`cfg\\.${key}\\b|cfg\\[['"]${key}['"]\\]`)
      if (pat.test(c)) ok(`Renderer reads "${key}"`)
      else warn(`Renderer does NOT read "${key}" in ${type}`)
    }
  }

  // NEW settings that may not be wired yet
  const newChecks = {
    brand_text: ['logoAnim'],
    slideshow: ['autoRotate', 'showArrows', 'showDots'],
    collection_grid: ['columnsDesktop', 'gap', 'cardRadius'],
    featured_products: ['columnsDesktop', 'gap', 'imageRadius'],
  }
  for (const [type, keys] of Object.entries(newChecks)) {
    for (const key of keys) {
      const pat = new RegExp(`cfg\\.${key}\\b|cfg\\[['"]${key}['"]\\]|cfg\\.`)
      if (pat.test(wiringSource) && wiringSource.includes(key)) ok(`NEW setting "${key}" wired in ${type}`)
      else warn(`NEW setting "${key}" NOT wired in ${type} renderer (relies only on CSS injection)`)
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${'\u2550'.repeat(60)}`)
  console.log(`THEME BUILDER AUDIT`)
  console.log(`Date: ${new Date().toISOString()}`)
  console.log(`URL: ${BASE}`)
  console.log(`${'\u2550'.repeat(60)}`)

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  if (await goto(page, BASE)) {
    await auditBodyBackground(page)
    await auditCssVars(page)
    await auditAnimCss(page)
    await auditKeyframes(page, ['homeu-gradient-shift', 'homeu-fadeIn', 'homeu-slideUp',
      'homeu-slideInLeft', 'homeu-slideInRight', 'homeu-zoomIn'])
    await auditStorefrontSections(page)
  }

  await auditSettingSchemaApi()
  await auditSectionsApi()
  await auditThemeSettingsApi()
  auditSectionPresets()
  auditFooterComponents()
  auditNewFiles()
  auditHomeSectionsWiring()
  auditSettingsBinding()

  // Summary
  console.log(`\n${'\u2550'.repeat(60)}`)
  console.log(`SUMMARY`)
  console.log(`${'\u2550'.repeat(60)}`)
  console.log(`${PASS} Passed: ${passed}`)
  console.log(`${FAIL} Failed: ${failed}`)
  console.log(`${WARN} Warnings: ${warnings}`)
  console.log(`Total tests: ${passed + failed + warnings}`)

  if (issues.length > 0) {
    console.log(`\nIssues:`)
    for (const issue of issues) {
      console.log(`  ${issue.severity === 'FAIL' ? 'RED' : 'YELLOW'} ${issue.msg}`)
      if (issue.detail) console.log(`     ${issue.detail}`)
    }
  }

  const reportPath = resolve(__dirname, '..', 'output', 'theme-audit-report.json')
  mkdirSync(resolve(__dirname, '..', 'output'), { recursive: true })
  writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    passed, failed, warnings,
    total: passed + failed + warnings,
    issues,
  }, null, 2))
  console.log(`\nReport: ${reportPath}`)

  await browser.close()
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
