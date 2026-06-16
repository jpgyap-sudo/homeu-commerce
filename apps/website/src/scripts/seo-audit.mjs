#!/usr/bin/env node

/**
 * SEO Migration Health audit.
 *
 * Compares the migrated source data (tools/shopify-import/output/*.json)
 * against what's actually in the local Postgres DB, checks SEO-critical
 * fields, and cross-checks redirect coverage. Writes a report consumed by
 * apps/website/src/scripts/seed-seo-health.mjs (which pushes it into the
 * "seo-health" global (table: seo_health) so it shows up in /admin).
 *
 * Usage: node src/scripts/seo-audit.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../../../../')
const OUTPUT_DIR = path.join(REPO_ROOT, 'tools', 'shopify-import', 'output')

function loadEnv() {
  const envPath = path.resolve(__dirname, '../../.env')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!(key in process.env)) process.env[key] = value
  }
}

function loadJSON(filename) {
  const filepath = path.join(OUTPUT_DIR, filename)
  if (!fs.existsSync(filepath)) return []
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'))
}

function pct(passed, total) {
  if (total === 0) return 100
  return Math.round((passed / total) * 1000) / 10
}

function nonEmpty(v) {
  return typeof v === 'string' && v.trim().length > 0
}

async function main() {
  loadEnv()

  const products = loadJSON('daVinciOS-products.json')
  const categories = loadJSON('daVinciOS-categories.json')
  const pages = loadJSON('daVinciOS-pages.json')
  const redirects = loadJSON('redirects.json')

  const client = new pg.Client({ connectionString: process.env.DATABASE_URI })
  await client.connect()

  const { rows: [pCount] } = await client.query('SELECT count(*) FROM products')
  const { rows: [cCount] } = await client.query('SELECT count(*) FROM categories')
  const { rows: [pgCount] } = await client.query('SELECT count(*) FROM pages')
  const redirectStatusRows = await client.query('SELECT status, count(*) FROM redirects GROUP BY status')

  let redirectsInDb = { pending: 0, active: 0, ignored: 0, verified: 0 }
  for (const row of redirectStatusRows.rows) {
    redirectsInDb[row.status] = Number(row.count)
  }
  const { rows: [verifiedRow] } = await client.query('SELECT count(*) FROM redirects WHERE verified = true')
  redirectsInDb.verified = Number(verifiedRow.count)
  const totalRedirects = (await client.query('SELECT count(*) FROM redirects')).rows[0].count
  await client.end()

  const checks = []

  // 1. Migration completeness (DB vs source) — highest impact, this is the
  //    "did everything actually move over" check.
  checks.push({
    label: 'Categories migrated to database',
    passed: Number(cCount.count),
    total: categories.length,
    impact: 'high',
    description: 'Every category from Shopify should exist in the new database before launch.',
  })
  checks.push({
    label: 'Products migrated to database',
    passed: Number(pCount.count),
    total: products.length,
    impact: 'high',
    description: 'Every product page needs to exist at launch, or its old Shopify URL will 404 even with a redirect in place.',
  })
  checks.push({
    label: 'Pages migrated to database',
    passed: Number(pgCount.count),
    total: pages.length,
    impact: 'high',
    description: 'Static pages (About, FAQs, policies, etc.) need to exist so any inbound links/redirects land on real content.',
  })

  // 2. SEO metadata completeness on source data (source is the ground truth
  //    for what WILL be migrated; DB may still be partially seeded).
  const seoTitleProducts = products.filter((p) => nonEmpty(p.seoTitle)).length
  const seoDescProducts = products.filter((p) => nonEmpty(p.seoDescription)).length
  const seoTitleCategories = categories.filter((c) => nonEmpty(c.seoTitle)).length
  const seoDescCategories = categories.filter((c) => nonEmpty(c.seoDescription)).length
  const seoTitlePages = pages.filter((p) => nonEmpty(p.seoTitle)).length
  const seoDescPages = pages.filter((p) => nonEmpty(p.seoDescription)).length

  checks.push({
    label: 'Products have an SEO title',
    passed: seoTitleProducts,
    total: products.length,
    impact: 'medium',
    description: 'Missing SEO titles fall back to the product title, which is usually fine, but custom titles improve click-through from search.',
  })
  checks.push({
    label: 'Products have an SEO meta description',
    passed: seoDescProducts,
    total: products.length,
    impact: 'medium',
    description: 'Missing meta descriptions let Google auto-generate a snippet, which can reduce click-through rates.',
  })
  checks.push({
    label: 'Categories have SEO title + description',
    passed: categories.filter((c) => nonEmpty(c.seoTitle) && nonEmpty(c.seoDescription)).length,
    total: categories.length,
    impact: 'high',
    description: 'Category pages are changing URL (/collections -> /categories), so strong on-page SEO here matters most for retaining rankings.',
  })
  checks.push({
    label: 'Pages have SEO title + description',
    passed: pages.filter((p) => nonEmpty(p.seoTitle) && nonEmpty(p.seoDescription)).length,
    total: pages.length,
    impact: 'low',
    description: 'Static pages keep the same URL pattern, so this is lower risk, but still affects search snippets.',
  })

  // 3. Original URL preservation — required for redirect map accuracy.
  const productsWithOriginalUrl = products.filter((p) => nonEmpty(p.shopifyOriginalUrl) || nonEmpty(p.shopifyUrl)).length
  const categoriesWithOriginalUrl = categories.filter((c) => nonEmpty(c.shopifyOriginalUrl)).length
  const pagesWithOriginalUrl = pages.filter((p) => nonEmpty(p.shopifyOriginalUrl)).length
  checks.push({
    label: 'Original Shopify URLs preserved on records',
    passed: productsWithOriginalUrl + categoriesWithOriginalUrl + pagesWithOriginalUrl,
    total: products.length + categories.length + pages.length,
    impact: 'high',
    description: 'Every record keeps a shopifyOriginalUrl/shopifyUrl field — this is what the redirect map is generated from. If this drops, future redirects can’t be auto-generated.',
  })

  // 4. Redirect coverage — every category whose URL pattern changed should
  //    have a corresponding redirect row.
  const categoryRedirectsNeeded = redirects.filter((r) => r.sourceType === 'category').length
  checks.push({
    label: 'Changed category URLs have a redirect defined',
    passed: Math.min(Number(totalRedirects), categoryRedirectsNeeded),
    total: categoryRedirectsNeeded,
    impact: 'high',
    description: 'Each /collections/{handle} -> /categories/{slug} change needs a 301 redirect or the old (often Google-indexed) URL will 404.',
  })
  checks.push({
    label: 'Redirects reviewed & marked active/verified before launch',
    passed: redirectsInDb.active + redirectsInDb.verified,
    total: Number(totalRedirects) || 1,
    impact: 'medium',
    description: 'Redirects currently sit as "pending" until you review them in the Redirects tab and mark them active/verified.',
  })

  // Weighted score
  const weight = { high: 3, medium: 2, low: 1 }
  let weightedSum = 0
  let weightTotal = 0
  for (const c of checks) {
    const ratio = c.total === 0 ? 1 : c.passed / c.total
    const w = weight[c.impact] ?? 1
    weightedSum += ratio * w
    weightTotal += w
  }
  const score = Math.round((weightedSum / weightTotal) * 1000) / 10

  let grade = 'F'
  if (score >= 90) grade = 'A'
  else if (score >= 80) grade = 'B'
  else if (score >= 70) grade = 'C'
  else if (score >= 60) grade = 'D'

  // Recommendations
  const recommendations = []
  if (Number(pCount.count) < products.length) {
    recommendations.push({
      text: `Run the full product seed — only ${pCount.count} of ${products.length} products are in the database. Old Shopify product URLs that redirect/link to these will 404 until this completes.`,
      priority: 'high',
    })
  }
  if (redirectsInDb.pending > 0) {
    recommendations.push({
      text: `Review the ${redirectsInDb.pending} pending redirects in the Redirects tab and mark them "active" once you're happy with the mapping.`,
      priority: 'high',
    })
  }
  if (redirectsInDb.verified < Number(totalRedirects)) {
    recommendations.push({
      text: `Test redirects on a staging deploy and check "Tested on staging" for each before the DNS cutover — ${Number(totalRedirects) - redirectsInDb.verified} not yet verified.`,
      priority: 'medium',
    })
  }
  if (seoDescProducts < products.length) {
    recommendations.push({
      text: `${products.length - seoDescProducts} products have no SEO meta description — Google will auto-generate snippets for these, which is fine but not optimal.`,
      priority: 'low',
    })
  }
  recommendations.push({
    text: 'Do not change DNS or close Shopify until the score above is in the A range and all high-priority redirects are verified.',
    priority: 'high',
  })

  const summary = `Migration data is ${grade === 'A' ? 'in great shape' : 'progressing'}: ${categories.length} categories, ${products.length} products and ${pages.length} pages are ready in the export, with ${pCount.count}/${products.length} products currently loaded into the database. ${totalRedirects} redirect(s) are mapped for the URL pattern that changed (/collections -> /categories); ${redirectsInDb.pending} still need review. No DNS or Shopify changes have been made — this score reflects readiness only.`

  const report = {
    generatedAt: new Date().toISOString(),
    score,
    grade,
    summary,
    totals: {
      products: products.length,
      categories: categories.length,
      pages: pages.length,
    },
    checks: checks.map((c) => ({ ...c, percent: pct(c.passed, c.total) })),
    redirectsSummary: {
      total: Number(totalRedirects),
      pending: redirectsInDb.pending || 0,
      active: redirectsInDb.active || 0,
      verified: redirectsInDb.verified || 0,
    },
    recommendations,
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, 'seo-audit.json'), JSON.stringify(report, null, 2))

  console.log(`\n=== SEO Migration Health: ${score}/100 (${grade}) ===`)
  for (const c of report.checks) {
    console.log(`  [${c.impact}] ${c.label}: ${c.passed}/${c.total} (${c.percent}%)`)
  }
  console.log('\nRecommendations:')
  for (const r of recommendations) console.log(`  [${r.priority}] ${r.text}`)
  console.log(`\nWrote: ${path.join(OUTPUT_DIR, 'seo-audit.json')}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
