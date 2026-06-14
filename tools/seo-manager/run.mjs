#!/usr/bin/env node
/**
 * SEO Manager – validates URL, meta, and JSON‑LD parity.
 *
 * 1️⃣ Loads Playwright scan results (seo-metadata.json)
 * 2️⃣ Loads Shopify export (shopify-export.json)
 * 3️⃣ Loads redirect map (tools/url-mapper/redirects.json)
 * 4️⃣ Performs deep comparison + AI‑assisted gap detection
 * 5️⃣ Writes:
 *    - tools/seo-audit/report.json   (full diff)
 *    - tools/seo-audit/suggestions.txt (human‑readable fixes)
 *    - tools/seo-audit/results.json (summary scores)
 * 6️⃣ Logs tasks/bugs to central logger.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { logTask, logBug } from '../tools/shared/central-logger.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ---------- Load data ----------
const SEO_DATA_PATH = path.resolve(__dirname, '../playwright-scanner/output/data/seo-metadata.json')
const SHOPIFY_EXPORT_PATH = path.resolve(__dirname, '../../tools/shopify-import/output/shopify-api/shopify-export.json')
const REDIRECTS_PATH = path.resolve(__dirname, '../../tools/url-mapper/redirects.json')
const REPORT_DIR = path.resolve(__dirname, '../seo-audit')
fs.mkdirSync(REPORT_DIR, { recursive: true })

const seoData = JSON.parse(fs.readFileSync(SEO_DATA_PATH, 'utf8'))
const shopifyExport = JSON.parse(fs.readFileSync(SHOPIFY_EXPORT_PATH, 'utf8'))
const redirects = JSON.parse(fs.readFileSync(REDIRECTS_PATH, 'utf8'))

// ---------- Helper utilities ----------
function normalizeUrl(url) {
  try {
    const u = new URL(url)
    let p = u.pathname.replace(/\/+$/, '')
    if (p === '') p = '/'
    return `${u.origin}${p}`
  } catch { return url }
}

function diffObjects(a, b) {
  const diffs = {}
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) diffs[k] = { old: a[k], new: b[k] }
  }
  return diffs
}

// ---------- 1️⃣ URL Consistency ----------
async function validateUrls() {
  const missingRedirects = []
  const extraRedirects = []

  // Build a set of all canonical URLs from the scan
  const scannedUrls = new Set(seoData.map(p => normalizeUrl(p.url)))

  // Verify each scanned URL has a 301 rule
  for (const url of scannedUrls) {
    if (!redirects[url]) missingRedirects.push(url)
  }

  // Verify we don't have stray redirects pointing to non‑existent pages
  for (const src of Object.keys(redirects)) {
    if (!scannedUrls.has(src)) extraRedirects.push(src)
  }

  return { missingRedirects, extraRedirects }
}

// ---------- 2️⃣ Meta‑Tag Validation ----------
async function validateMeta() {
  const metaDiffs = []
  const shopifyPages = shopifyExport.pages || []
  const shopifyProducts = shopifyExport.products || []

  // Helper to find matching Shopify entity by handle
  const findShopify = (type, handle) => {
    if (type === 'product') return shopifyProducts.find(p => p.handle === handle)
    if (type === 'page') return shopifyPages.find(p => p.handle === handle)
    return null
  }

  for (const page of seoData) {
    const type = page.type
    const handle = page.url.split('/').pop().replace(/\/$/, '')
    const shopItem = findShopify(type, handle)

    if (!shopItem) continue // skip if no Shopify counterpart (e.g., 404)

    const shopMeta = {
      title: shopItem.title || '',
      metaDescription: shopItem.body_html ? shopItem.body_html.replace(/<[^>]+>/g, '').substring(0, 160) : '',
      canonical: `https://${shopifyExport.store}/${type}s/${handle}`,
      ogTitle: shopItem.title || '',
      ogDescription: shopItem.body_html ? shopItem.body_html.replace(/<[^>]+>/g, '').substring(0, 160) : '',
    }

    const diff = diffObjects({
      title: page.title,
      metaDescription: page.metaDescription,
      canonical: page.canonical,
      ogTitle: page.ogTitle,
      ogDescription: page.ogDescription,
    }, shopMeta)

    if (Object.keys(diff).length > 0) {
      metaDiffs.push({ url: page.url, type, handle, diff })
    }
  }

  return metaDiffs
}

// ---------- 3️⃣ JSON‑LD Validation ----------
async function validateJsonLd() {
  const jsonLdIssues = []

  for (const page of seoData) {
    if (!page.jsonLd || page.jsonLd.length === 0) continue

    for (const ld of page.jsonLd) {
      // Basic validation: must be an object and have @type
      if (typeof ld !== 'object' || ld === null || !ld['@type']) {
        jsonLdIssues.push({ url: page.url, issue: 'Missing or invalid @type in JSON‑LD', ld })
        continue
      }
      // Optionally, you could validate against a schema here
    }
  }

  return jsonLdIssues
}

// ---------- 4️⃣ AI‑Assisted Gap Detection (optional) ----------
async function aiGapDetection() {
  // This would call Ollama to analyze screenshots and suggest missing SEO elements.
  // For now, we placeholder; you can integrate with the existing Ollama vision in the scanner.
  return []
}

// ---------- Main ----------
async function main() {
  await logTask({
    agent: 'seo-manager',
    status: 'active',
    summary: 'Starting SEO validation for migration',
    files: [SEO_DATA_PATH, SHOPIFY_EXPORT_PATH, REDIRECTS_PATH],
    verification: 'Comparing Shopify export vs Playwright scan vs redirect map',
  })

  const [urlResult, metaResult, jsonLdResult, aiResult] = await Promise.all([
    validateUrls(),
    validateMeta(),
    validateJsonLd(),
    aiGapDetection(),
  ])

  const report = {
    timestamp: new Date().toISOString(),
    urlConsistency: urlResult,
    metaTagValidation: metaResult,
    jsonLdValidation: jsonLdResult,
    aiGapDetection: aiResult,
  }

  // Write full report
  const reportPath = path.join(REPORT_DIR, 'report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

  // Generate human‑readable suggestions
  const suggestions = []
  if (urlResult.missingRedirects.length > 0) {
    suggestions.push(`❌ Missing redirects for ${urlResult.missingRedirects.length} URLs:`)
    suggestions.push(...urlResult.missingRedirects.map(u => `  - ${u}`))
  }
  if (urlResult.extraRedirects.length > 0) {
    suggestions.push(`⚠️  Extra redirects pointing to non‑existent pages (${urlResult.extraRedirects.length}):`)
    suggestions.push(...urlResult.extraRedirects.map(u => `  - ${u}`))
  }
  if (metaResult.length > 0) {
    suggestions.push(`🔖 Meta‑tag mismatches (${metaResult.length}):`)
    for (const m of metaResult) {
      suggestions.push(`  - ${m.url} (${m.type}:${m.handle})`)
      for (const [key, { old, new: nw }] of Object.entries(m.diff)) {
        suggestions.push(`      ${key}: "${old}" → "${nw}"`)
      }
    }
  }
  if (jsonLdResult.length > 0) {
    suggestions.push(`🧩 JSON‑LD issues (${jsonLdResult.length}):`)
    for (const j of jsonLdResult) {
      suggestions.push(`  - ${j.url}: ${j.issue}`)
    }
  }
  if (suggestions.length === 0) {
    suggestions.push('✅ All SEO checks passed – no action required.')
  }

  const suggestionsPath = path.join(REPORT_DIR, 'suggestions.txt')
  fs.writeFileSync(suggestionsPath, suggestions.join('\n'))

  // Summary scores for results.json
  const results = {
    timestamp: new Date().toISOString(),
    scores: {
      urlConsistency: urlResult.missingRedirects.length === 0 && urlResult.extraRedirects.length === 0 ? 100 : Math.max(0, 100 - (urlResult.missingRedirects.length + urlResult.extraRedirects.length) * 5),
      metaTagValidation: metaResult.length === 0 ? 100 : Math.max(0, 100 - metaResult.length * 10),
      jsonLdValidation: jsonLdResult.length === 0 ? 100 : Math.max(0, 100 - jsonLdResult.length * 10),
    },
    passed: urlResult.missingRedirects.length === 0 && urlResult.extraRedirects.length === 0 && metaResult.length === 0 && jsonLdResult.length === 0,
  }

  const resultsPath = path.join(REPORT_DIR, 'results.json')
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2))

  // Log bugs if any critical issues
  if (urlResult.missingRedirects.length > 0 || metaResult.length > 0) {
    await logBug({
      agent: 'seo-manager',
      status: 'found',
      summary: `SEO mismatches detected: ${urlResult.missingRedirects.length} missing redirects, ${metaResult.length} meta‑tag mismatches`,
      files: [reportPath, suggestionsPath],
      verification: 'See seo-audit/report.json and seo-audit/suggestions.txt',
    })
  }

  await logTask({
    agent: 'seo-manager',
    status: 'completed',
    summary: 'SEO validation finished',
    files: [reportPath, suggestionsPath, resultsPath],
    verification: `Score: ${results.scores.urlConsistency}% URL, ${results.scores.metaTagValidation}% meta, ${results.scores.jsonLdValidation}% JSON‑LD`,
  })

  console.log(`✅ SEO audit complete. Report: ${reportPath}`)
  console.log(`📝 Suggestions: ${suggestionsPath}`)
  console.log(`📊 Results: ${resultsPath}`)
}

main().catch(err => {
  console.error('❌ SEO Manager failed:', err)
  process.exit(1)
})