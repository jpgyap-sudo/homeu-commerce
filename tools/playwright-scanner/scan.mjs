#!/usr/bin/env node

/**
 * Playwright Site Scanner
 * 
 * Crawls www.homeu.ph with Playwright to extract all data for migration.
 * Uses HTML content parsing (not page.evaluate) for robustness against
 * Shopify's JavaScript navigation patterns.
 * 
 * Usage:
 *   node scan.mjs [options]
 *   --url         Starting URL (default: https://www.homeu.ph)
 *   --output      Output directory
 *   --screenshots Take screenshots (default: true)
 *   --delay       Delay between page loads in ms (default: 1000)
 *   --max-pages   Max pages to scan (default: 1000)
 *   --ollama      Use Ollama vision for analysis (default: false)
 */

import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = path.resolve(__dirname, 'output')
const INPUT_DIR = path.resolve(__dirname, '..', 'shopify-import', 'input')

const args = process.argv.slice(2)
const START_URL = args.includes('--url') ? args[args.indexOf('--url') + 1] : 'https://www.homeu.ph'
const CUSTOM_OUTPUT = args.includes('--output') ? args[args.indexOf('--output') + 1] : OUTPUT_DIR
const TAKE_SCREENSHOTS = !args.includes('--no-screenshots')
const PAGE_DELAY = parseInt(args.includes('--delay') ? args[args.indexOf('--delay') + 1] : '1000')
const MAX_PAGES = parseInt(args.includes('--max-pages') ? args[args.indexOf('--max-pages') + 1] : '1000')
const USE_OLLAMA = args.includes('--ollama')

const SCREENSHOTS_DIR = path.join(CUSTOM_OUTPUT, 'screenshots')
const DATA_DIR = path.join(CUSTOM_OUTPUT, 'data')
const RAW_DIR = path.join(CUSTOM_OUTPUT, 'raw')
;[CUSTOM_OUTPUT, SCREENSHOTS_DIR, DATA_DIR, RAW_DIR].forEach(dir => fs.mkdirSync(dir, { recursive: true }))

const visited = new Set()
const allPages = []
const products = []
const collections = []
const allImages = []
const seoData = []
const brokenLinks = []

function catUrl(url) {
  const p = new URL(url).pathname
  if (/\/products\//.test(p)) return 'product'
  if (/\/collections\//.test(p)) return 'collection'
  if (/\/pages\//.test(p)) return 'page'
  if (/\/blogs\//.test(p)) return 'blog'
  if (/\/policies\//.test(p)) return 'policy'
  if (p === '/' || p === '') return 'homepage'
  return 'other'
}

function extractHandle(url, pattern) {
  const m = url.match(pattern)
  return m ? m[1] : null
}

function isInternal(url, base) {
  try {
    const u = new URL(url), b = new URL(base)
    return u.hostname === b.hostname || u.hostname.endsWith('.homeu.ph')
  } catch { return false }
}

function shouldVisit(url, base) {
  if (visited.has(url)) return false
  if (!isInternal(url, base)) return false
  if (/\.(png|jpg|jpeg|gif|svg|css|js|pdf|zip)$/i.test(url)) return false
  if (/\?/.test(url) || /#/.test(url)) return false
  if (/\/cdn\.shopify/.test(url) || /\/checkouts\//.test(url)) return false
  if (/\/account\//.test(url) || /\/cart/.test(url)) return false
  return true
}

// Parse HTML content for SEO metadata (regardless of JS execution)
function parseHTMLForSEO(html, url) {
  const getMeta = (name) => {
    const r1 = new RegExp(`<meta[^>]+name=["']${escapeRegex(name)}["'][^>]+content=["']([^"']*)["']`, 'i')
    const r2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${escapeRegex(name)}["']`, 'i')
    const m = html.match(r1) || html.match(r2)
    return m ? m[1] : ''
  }
  const getProp = (prop) => {
    const r = new RegExp(`<meta[^>]+property=["']${escapeRegex(prop)}["'][^>]+content=["']([^"']*)["']`, 'i')
    const m = html.match(r)
    return m ? m[1] : ''
  }
  const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || ''
  const canonical = (html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i) || [])[1] || ''
  const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || ''
  const h1Clean = h1.replace(/<[^>]+>/g, '').trim()
  
  return {
    title: title.trim(),
    metaDescription: getMeta('description'),
    canonical, h1: h1Clean,
    ogTitle: getProp('og:title'),
    ogDescription: getProp('og:description'),
    ogImage: getProp('og:image'),
    jsonLd: extractJSONLD(html),
  }
}

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

function extractJSONLD(html) {
  const results = []
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match
  while ((match = regex.exec(html)) !== null) {
    try { results.push(JSON.parse(match[1])) } catch { /* skip invalid JSON */ }
  }
  return results
}

function extractImagesFromHTML(html, baseUrl) {
  const images = []
  const regex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  let match
  while ((match = regex.exec(html)) !== null) {
    const imgTag = match[0]
    const src = match[1]
    const alt = (imgTag.match(/alt=["']([^"']*)["']/i) || [])[1] || ''
    try {
      const fullUrl = src.startsWith('http') ? src : new URL(src, baseUrl).href
      images.push({ src: fullUrl, alt, baseUrl })
    } catch { /* skip invalid URLs */ }
  }
  return images
}

function extractLinksFromHTML(html, baseUrl) {
  const links = []
  const regex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi
  let match
  while ((match = regex.exec(html)) !== null) {
    const href = match[1]
    if (href.startsWith('#') || href.startsWith('javascript:')) continue
    try {
      links.push(new URL(href, baseUrl).href)
    } catch { /* skip invalid */ }
  }
  return [...new Set(links)]
}

async function analyzeWithOllama(imagePath, prompt) {
  if (!USE_OLLAMA) return null
  try {
    const base64 = fs.readFileSync(imagePath).toString('base64')
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llava:7b', prompt, images: [base64], stream: false,
      })
    })
    const data = await response.json()
    return data.response
  } catch (err) {
    console.warn(`  ⚠️  Ollama: ${err.message}`)
    return null
  }
}

// ============================
// MAIN SCAN LOOP
// ============================
async function scan() {
  console.log('🚀 Playwright Site Scanner')
  console.log(`   Start URL: ${START_URL}`)
  console.log(`   Screenshots: ${TAKE_SCREENSHOTS}`)
  console.log(`   Ollama Vision: ${USE_OLLAMA ? '✅ llava:7b' : '❌'}`)
  console.log(`   Max pages: ${MAX_PAGES}\n`)

  // Load Shopify export CSV if available
  const csvPath = path.join(INPUT_DIR, 'products.csv')
  let shopifyProducts = []
  if (fs.existsSync(csvPath)) {
    // Basic CSV parsing for product validation
    const csv = fs.readFileSync(csvPath, 'utf-8')
    shopifyProducts = csv.split('\n').filter(l => l.trim()).slice(1)
    console.log(`📦 ${shopifyProducts.length} products from Shopify export\n`)
  }

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
  })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
  })
  const page = await context.newPage()

  // Normalize URL: strip trailing slash for consistency
  const normalizeUrl = (u) => {
    try {
      const parsed = new URL(u)
      let path = parsed.pathname
      if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
      return `${parsed.protocol}//${parsed.hostname}${path}${parsed.search}`
    } catch { return u }
  }

  const queue = [normalizeUrl(START_URL)]
  const normalizeAdd = (url) => {
    const norm = normalizeUrl(url)
    if (!visited.has(norm) && !queue.includes(norm)) queue.push(norm)
  }
  let pagesScanned = 0

  while (queue.length > 0 && pagesScanned < MAX_PAGES) {
    const url = queue.shift()
    if (visited.has(url) || visited.has(normalizeUrl(url))) continue
    visited.add(url)

    try {
      console.log(`📄 [${pagesScanned + 1}] ${url}`)

      // Load the page (domcontentloaded is faster than load)
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {
        // Fallback: try again with shorter timeout
        return page.goto(url, { waitUntil: 'commit', timeout: 15000 }).catch(() => {})
      })
      
      // Small wait for page to stabilize
      await new Promise(r => setTimeout(r, 1500))

      // Get HTML content (safe even if page context is unstable)
      let html = ''
      try { html = await page.content() } catch { /* content not available */ }
      if (!html) continue

      const pageType = catUrl(url)
      const timestamp = new Date().toISOString()

      // Parse SEO from HTML
      const seo = parseHTMLForSEO(html, url)
      seoData.push({ url, type: pageType, ...seo })

      // Parse images from HTML
      const images = extractImagesFromHTML(html, url)

      const pageRecord = {
        url, type: pageType, seo, images,
        productHandle: extractHandle(url, /\/products\/([^/?]+)/),
        collectionHandle: extractHandle(url, /\/collections\/([^/?]+)/),
        timestamp,
      }
      allPages.push(pageRecord)
      if (pageType === 'product') products.push(pageRecord)
      if (pageType === 'collection') collections.push(pageRecord)

      // Collect Shopify product images
      if (pageType === 'product') {
        const shopifyImgs = images.filter(img => 
          img.src.includes('cdn.shopify.com') || img.src.includes('shopify')
        )
        allImages.push(...shopifyImgs.map(img => ({
          ...img, productUrl: url, productHandle: extractHandle(url, /\/products\/([^/?]+)/),
        })))
      }

      // Screenshot
      if (TAKE_SCREENSHOTS) {
        try {
          const safeName = url.replace(/https?:\/\//, '').replace(/[\/?#]/g, '_').substring(0, 120)
          const shotPath = path.join(SCREENSHOTS_DIR, `${safeName}.png`)
          await page.screenshot({ path: shotPath, fullPage: true })
          if (USE_OLLAMA) {
            const analysis = await analyzeWithOllama(shotPath, 
              'Describe this web page layout: what type of page, what sections exist, navigation structure, products shown, and any notable visual elements.')
            if (analysis) {
              fs.writeFileSync(shotPath.replace(/\.png$/, '.analysis.txt'), analysis)
            }
          }
        } catch { /* screenshot failed */ }
      }

      // Save raw HTML
      try {
        const safeFile = url.replace(/https?:\/\//, '').replace(/[\/?#]/g, '_').substring(0, 120)
        fs.writeFileSync(path.join(RAW_DIR, `${safeFile}.html`), html)
      } catch { /* save failed */ }

      // Extract links and add to queue
      const links = extractLinksFromHTML(html, url)
      for (const link of links) {
        if (shouldVisit(link, START_URL)) {
          normalizeAdd(link)
        }
      }

      pagesScanned++
      if (queue.length > 0 && PAGE_DELAY > 0) {
        await new Promise(r => setTimeout(r, PAGE_DELAY))
      }

    } catch (err) {
      console.warn(`  ⚠️  Skipping ${url}: ${err.message}`)
    }
  }

  await browser.close()

  // ============================
  // SAVE RESULTS
  // ============================
  console.log('\n💾 Saving results...')
  
  fs.writeFileSync(path.join(DATA_DIR, 'all-pages.json'), JSON.stringify(allPages, null, 2))
  fs.writeFileSync(path.join(DATA_DIR, 'products.json'), JSON.stringify(products, null, 2))
  fs.writeFileSync(path.join(DATA_DIR, 'collections.json'), JSON.stringify(collections, null, 2))
  fs.writeFileSync(path.join(DATA_DIR, 'seo-metadata.json'), JSON.stringify(seoData, null, 2))
  fs.writeFileSync(path.join(DATA_DIR, 'all-images.json'), JSON.stringify(allImages, null, 2))
  fs.writeFileSync(path.join(DATA_DIR, 'broken-links.json'), JSON.stringify(brokenLinks, null, 2))

  const summary = {
    scanDate: new Date().toISOString(),
    startUrl: START_URL,
    pagesScanned: allPages.length,
    productsFound: products.length,
    collectionsFound: collections.length,
    totalImages: allImages.length,
    seoRecords: seoData.length,
    pagesByType: {},
  }
  allPages.forEach(p => {
    summary.pagesByType[p.type] = (summary.pagesByType[p.type] || 0) + 1
  })
  fs.writeFileSync(path.join(DATA_DIR, 'scan-summary.json'), JSON.stringify(summary, null, 2))

  // Share crawl findings with shopify-import output, under crawl-* names so
  // they never collide with the canonical Shopify Admin API export
  // (DaVinciOS-products.json / DaVinciOS-pages.json, generated by
  // transform-bulk-export.mjs / transform-pages.mjs and consumed by
  // seed-postgres.mjs).
  const sharedOutput = path.resolve(__dirname, '..', 'shopify-import', 'output')
  fs.mkdirSync(sharedOutput, { recursive: true })
  fs.writeFileSync(path.join(sharedOutput, 'crawl-products.json'), JSON.stringify(products, null, 2))
  if (allPages.some(p => p.type === 'page' || p.type === 'blog')) {
    fs.writeFileSync(path.join(sharedOutput, 'crawl-pages.json'), JSON.stringify(
      allPages.filter(p => ['page', 'blog', 'homepage'].includes(p.type)), null, 2))
  }
  fs.writeFileSync(path.join(sharedOutput, 'crawl-seo-metadata.json'), JSON.stringify(seoData, null, 2))

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 SCAN COMPLETE')
  console.log('='.repeat(50))
  console.log(`   Pages scanned:    ${summary.pagesScanned}`)
  console.log(`   Products found:   ${summary.productsFound}`)
  console.log(`   Collections:      ${summary.collectionsFound}`)
  console.log(`   SEO records:      ${summary.seoRecords}`)
  console.log(`   Unique images:    ${summary.totalImages}`)
  console.log('')
  for (const [type, count] of Object.entries(summary.pagesByType).sort()) {
    console.log(`   ${type.padEnd(15)} ${count}`)
  }
  console.log(`\n📁 Output: ${CUSTOM_OUTPUT}`)
}

scan().catch(err => { console.error('Fatal:', err); process.exit(1) })
