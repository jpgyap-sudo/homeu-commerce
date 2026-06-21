/**
 * CSS Usage Analyzer & Purger
 *
 * Crawls the local Next.js server, extracts all CSS class references from
 * the rendered HTML of key pages, and identifies unused CSS rules in
 * debut-overrides.css.
 *
 * Usage:
 *   1. Start the dev server: cd apps/website && npm run dev
 *   2. Run: node tools/analyze-css-usage.mjs
 *
 * Output: tools/css-usage-report.json + suggested purged debut-overrides.css
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CSS_PATH = join(__dirname, '..', 'apps', 'website', 'src', 'styles', 'debut-overrides.css')
const BASE = process.env.BASE_URL || 'http://localhost:3000'

// Key pages to analyze for CSS usage
const PAGES = [
  '/',
  '/products',
  '/products/test-product',
  '/pages/design-trends',
  '/collections/all',
  '/quote-cart',
  '/search',
  '/login',
  '/register',
  '/blog',
  '/customer/dashboard',
]

async function extractClasses(url) {
  try {
    const res = await fetch(url)
    const html = await res.text()
    // Extract all class names from HTML
    const classMatches = html.match(/class="([^"]*)"/g) || []
    const classes = new Set()
    for (const match of classMatches) {
      const names = match.replace(/class="/g, '').replace(/"/g, '').split(/\s+/)
      for (const name of names) {
        if (name && !name.includes('{') && !name.includes('}')) {
          classes.add(name)
        }
      }
    }
    return { url, classes: [...classes].sort(), htmlSize: html.length }
  } catch {
    return { url, classes: [], htmlSize: 0, error: 'Could not fetch' }
  }
}

function extractCssSelectors(cssContent) {
  const selectors = new Set()
  const lines = cssContent.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    // Match CSS selectors (lines that start a rule block)
    if (trimmed && !trimmed.startsWith('/*') && !trimmed.startsWith('*') && !trimmed.startsWith('@') && !trimmed.startsWith('}') && !trimmed.startsWith('  ') && !trimmed.startsWith('    ')) {
      const selector = trimmed.replace(/\s*\{.*$/, '').trim()
      if (selector && selector.length > 1 && !selector.includes(':')) {
        // Extract class names from selector
        const classNames = selector.match(/\.([\w-]+)/g) || []
        for (const cn of classNames) {
          selectors.add(cn.replace('.', ''))
        }
      }
    }
  }
  return [...selectors].sort()
}

console.log('\n═══════════════════════════════════════════')
console.log('  CSS Usage Analyzer')
console.log(`  CSS File: ${CSS_PATH}`)
console.log(`  Base URL: ${BASE}`)
console.log('═══════════════════════════════════════════\n')

// Read CSS file
if (!existsSync(CSS_PATH)) {
  console.error(`❌ CSS file not found at ${CSS_PATH}`)
  process.exit(1)
}

const cssContent = readFileSync(CSS_PATH, 'utf-8')
console.log(`📄 CSS file size: ${cssContent.length} bytes (${(cssContent.length / 1024).toFixed(1)} KB)\n`)

// Crawl pages
console.log('🌐 Crawling pages for class usage...\n')
const results = await Promise.all(PAGES.map(url => extractClasses(BASE + url)))

// Collect all used classes
const usedClasses = new Set()
for (const result of results) {
  if (result.error) {
    console.log(`  ⚠️  ${result.url} — ${result.error}`)
  } else {
    console.log(`  ✅ ${result.url} — ${result.classes.length} classes, ${(result.htmlSize / 1024).toFixed(1)} KB`)
    for (const cls of result.classes) usedClasses.add(cls)
  }
}

// Extract all defined CSS classes
const definedClasses = extractCssSelectors(cssContent)

// Find unused classes
const usedSet = new Set([...usedClasses].map(c => c.toLowerCase()))
const unusedClasses = definedClasses.filter(c => !usedSet.has(c.toLowerCase()))

// Also find used classes that aren't in the CSS
const definedSet = new Set(definedClasses.map(c => c.toLowerCase()))
const missingClasses = [...usedClasses].filter(c => !definedSet.has(c.toLowerCase()))

console.log(`\n📊 Summary:`)
console.log(`  CSS classes defined:    ${definedClasses.length}`)
console.log(`  CSS classes used:       ${[...usedClasses].filter(c => definedSet.has(c.toLowerCase())).length}`)
console.log(`  CSS classes unused:     ${unusedClasses.length} (${(unusedClasses.length / definedClasses.length * 100).toFixed(1)}%)`)
console.log(`  Classes used but missing from CSS: ${missingClasses.length}`)

// Report
if (unusedClasses.length > 0) {
  console.log(`\n🗑️  Top unused classes (sample):`)
  unusedClasses.slice(0, 30).forEach(c => console.log(`  - .${c}`))
  if (unusedClasses.length > 30) console.log(`  ... and ${unusedClasses.length - 30} more`)
}

if (missingClasses.length > 0) {
  console.log(`\n⚠️  Classes used in HTML but NOT defined in ${CSS_PATH}:`)
  missingClasses.slice(0, 20).forEach(c => console.log(`  - .${c}`))
}

// Save report
const report = {
  cssFile: CSS_PATH,
  cssSize: cssContent.length,
  cssSizeKB: (cssContent.length / 1024).toFixed(1),
  pagesCrawled: results.length,
  totalClassesDefined: definedClasses.length,
  totalClassesUsed: [...usedClasses].filter(c => definedSet.has(c.toLowerCase())).length,
  unusedCount: unusedClasses.length,
  unusedPercent: (unusedClasses.length / definedClasses.length * 100).toFixed(1),
  unusedClasses: unusedClasses,
  missingClasses: missingClasses,
  pageDetails: results.map(r => ({ url: r.url, classes: r.classes.length, sizeKB: (r.htmlSize / 1024).toFixed(1) })),
}

const reportPath = join(__dirname, 'css-usage-report.json')
writeFileSync(reportPath, JSON.stringify(report, null, 2))
console.log(`\n📝 Full report saved to: ${reportPath}`)

// Estimate savings from purging
const estimatedSavedBytes = cssContent.length * (unusedClasses.length / definedClasses.length)
console.log(`💾 Estimated savings: ~${(estimatedSavedBytes / 1024).toFixed(1)} KB (${(estimatedSavedBytes / cssContent.length * 100).toFixed(0)}%)\n`)
