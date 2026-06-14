#!/usr/bin/env node

/**
 * Playwright Site Scanner
 * 
 * Crawls www.homeu.ph with Playwright to:
 * - Discover all URLs (products, collections, pages, blogs)
 * - Extract full HTML content per page
 * - Screenshot every page for visual reference
 * - Extract SEO metadata (title, meta desc, canonical, OG tags)
 * - Extract image URLs and map to products
 * - Generate structured JSON output for Payload CMS import
 * 
 * Usage:
 *   node tools/playwright-scanner/scan.mjs [options]
 * 
 * Options:
 *   --url       Starting URL (default: https://www.homeu.ph)
 *   --output    Output directory (default: tools/playwright-scanner/output)
 *   --screenshots  Take screenshots (default: true)
 *   --delay     Delay between page loads in ms (default: 1000)
 *   --max-pages Max pages to scan (default: 1000)
 *   --ollama    Use Ollama vision for analysis (default: false)
 * 
 * Input (optional, for verification):
 *   tools/shopify-import/input/products.csv  - Shopify product export
 *   tools/shopify-import/input/images/       - Product images folder
 */

import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = path.resolve(__dirname, 'output')
const INPUT_DIR = path.resolve(__dirname, '..', 'shopify-import', 'input')

// Parse CLI args
const args = process.argv.slice(2)
const START_URL = args.includes('--url') ? args[args.indexOf('--url') + 1] : 'https://www.homeu.ph'
const CUSTOM_OUTPUT = args.includes('--output') ? args[args.indexOf('--output') + 1] : OUTPUT_DIR
const TAKE_SCREENSHOTS = !args.includes('--no-screenshots')
const PAGE_DELAY = parseInt(args.includes('--delay') ? args[args.indexOf('--delay') + 1] : '1000')
const MAX_PAGES = parseInt(args.includes('--max-pages') ? args[args.indexOf('--max-pages') + 1] : '1000')
const USE_OLLAMA = args.includes('--ollama')

// Ensure output directories
const SCREENSHOTS_DIR = path.join(CUSTOM_OUTPUT, 'screenshots')
const DATA_DIR = path.join(CUSTOM_OUTPUT, 'data')
const RAW_DIR = path.join(CUSTOM_OUTPUT, 'raw')
;[CUSTOM_OUTPUT, SCREENSHOTS_DIR, DATA_DIR, RAW_DIR].forEach(dir => {
  fs.mkdirSync(dir, { recursive: true })
})

// State
const visited = new Set()
const allPages = []
const products = []
const collections = []
const allImages = []
const seoData = []
const brokenLinks = []
const screenshotMap = {} // pageUrl -> screenshot path

// URL patterns for categorization
const PATTERNS = {
  product: /\/products\//,
  collection: /\/collections\//,
  page: /\/pages\//,
  blog: /\/blogs\//,
  policy: /\/policies\//,
}

function categorizeUrl(url) {
  const u = new URL(url)
  const path = u.pathname
  if (PATTERNS.product.test(path)) return 'product'
  if (PATTERNS.collection.test(path)) return 'collection'
  if (PATTERNS.page.test(path)) return 'page'
  if (PATTERNS.blog.test(path)) return 'blog'
  if (PATTERNS.policy.test(path)) return 'policy'
  if (path === '/' || path === '') return 'homepage'
  return 'other'
}

function extractProductHandle(url) {
  const match = url.match(/\/products\/([^/?]+)/)
  return match ? match[1] : null
}

function extractCollectionHandle(url) {
  const match = url.match(/\/collections\/([^/?]+)/)
  return match ? match[1] : null
}

function getLinksFromPage(page, baseUrl) {
  return page.$$eval('a[href]', (anchors, base) => {
    return anchors.map(a => {
      try {
        return new URL(a.getAttribute('href'), base).href
      } catch { return null }
    }).filter(Boolean)
  }, baseUrl)
}

function extractSEO(page) {
  return page.evaluate(() => ({
    title: document.title,
    metaDescription: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
    ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '',
    ogDescription: document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '',
    ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '',
    h1: document.querySelector('h1')?.textContent?.trim() || '',
    jsonLd: extractJSONLD(),
  }))
  function extractJSONLD() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]')
    return Array.from(scripts).map(s => {
      try { return JSON.parse(s.textContent) } catch { return null }
    }).filter(Boolean)
  }
}

function extractImages(page, sourceUrl) {
  return page.$$eval('img[src]', (imgs, base) => {
    return imgs.map(img => ({
      src: new URL(img.getAttribute('src'), base).href,
      alt: img.getAttribute('alt') || '',
      width: img.naturalWidth || img.getAttribute('width') || null,
      height: img.naturalHeight || img.getAttribute('height') || null,
    }))
  }, sourceUrl)
}

function isInternalUrl(url, baseUrl) {
  try {
    const u = new URL(url)
    const b = new URL(baseUrl)
    return u.hostname === b.hostname || u.hostname.endsWith('.homeu.ph')
  } catch { return false }
}

function shouldVisit(url, baseUrl) {
  if (visited.has(url)) return false
  if (!isInternalUrl(url, baseUrl)) return false
  // Skip static assets, API endpoints, etc.
  const skipPatterns = [/\?/ , /#/, /\.(png|jpg|jpeg|gif|svg|css|js|pdf|zip)$/i, /\/cdn\.shopify/, /\/checkouts\//, /\/account\//, /\/cart/]
  for (const p of skipPatterns) {
    if (p.test(url)) return false
  }
  return !visited.has(url)
}

// =============================================
// Ollama Vision Integration
// =============================================
async function analyzeWithOllama(imagePath, prompt) {
  if (!USE_OLLAMA) return null
  try {
    const base64 = fs.readFileSync(imagePath).toString('base64')
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llava:7b',
        prompt: prompt,
        images: [base64],
        stream: false,
      })
    })
    const data = await response.json()
    return data.response
  } catch (err) {
    console.warn(`  ⚠️  Ollama vision error: ${err.message}`)
    return null
  }
}

async function analyzeScreenshot(screenshotPath, pageUrl, pageType) {
  if (!USE_OLLAMA) return
  const prompts = {
    product: 'Describe this product page layout: what product is shown, what sections exist (title, price, description, images, variants, add-to-cart), and what navigation is visible.',
    collection: 'Describe this collection/category page layout: what products are listed, what filtering/sorting options exist, and how is the grid arranged.',
    homepage: 'Describe this homepage layout: what sections exist (hero, featured products, categories, testimonials), what is the visual hierarchy.',
    default: 'Describe this web page layout: what is the page structure, navigation, content sections, and footer.',
  }
  const prompt = prompts[pageType] || prompts.default
  const analysis = await analyzeWithOllama(screenshotPath, prompt)
  if (analysis) {
    const analysisFile = screenshotPath.replace(/\.png$/, '.analysis.json')
    fs.writeFileSync(analysisFile, JSON.stringify({ url: pageUrl, type: pageType, analysis }, null, 2))
    console.log(`  🧠  Ollama analysis saved: ${path.basename(analysisFile)}`)
  }
}

// =============================================
// Load Shopify Export Data (if available)
// =============================================
function loadShopifyExport() {
  const productsCsv = path.join(INPUT_DIR, 'products.csv')
  const imagesDir = path.join(INPUT_DIR, 'images')
  
  const shopifyData = { products: [], images: [] }

  if (fs.existsSync(productsCsv)) {
    const csv = fs.readFileSync(productsCsv, 'utf-8')
    const lines = csv.split('\n').filter(Boolean)
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const entry = {}
      headers.forEach((h, idx) => { entry[h] = vals[idx] || '' })
      shopifyData.products.push(entry)
    }
    console.log(`📦 Loaded ${shopifyData.products.length} products from Shopify export CSV`)
  }

  if (fs.existsSync(imagesDir)) {
    shopifyData.images = fs.readdirSync(imagesDir).filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
    console.log(`🖼️  Found ${shopifyData.images.length} product images in input directory`)
  }

  return shopifyData
}

// =============================================
// Main Scanner
// =============================================
async function scan() {
  console.log('🚀 Playwright Site Scanner')
  console.log(`   Start URL: ${START_URL}`)
  console.log(`   Output:    ${CUSTOM_OUTPUT}`)
  console.log(`   Screenshots: ${TAKE_SCREENSHOTS}`)
  console.log(`   Ollama Vision: ${USE_OLLAMA ? '✅ (llava:7b)' : '❌'}`)
  console.log(`   Max pages: ${MAX_PAGES}`)
  console.log('')

  // Load Shopify export if available
  const shopifyExport = loadShopifyExport()

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'HomeU-Migration-Scanner/1.0',
  })
  const page = await context.newPage()

  // Track errors
  page.on('pageerror', err => console.warn(`  ⚠️  Page error: ${err.message}`))

  // BFS crawl queue
  const queue = [START_URL]
  let pagesScanned = 0

  while (queue.length > 0 && pagesScanned < MAX_PAGES) {
    const url = queue.shift()
    if (visited.has(url)) continue
    visited.add(url)

    try {
      console.log(`📄 [${pagesScanned + 1}] ${url}`)
      
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
      
      const pageType = categorizeUrl(url)
      const timestamp = new Date().toISOString()

      // SEO Extraction
      const seo = extractSEO(page)
      seoData.push({ url, type: pageType, ...seo })

      // Image Extraction
      const images = extractImages(page, url)
      const pageRecord = {
        url,
        type: pageType,
        seo,
        images,
        productHandle: extractProductHandle(url),
        collectionHandle: extractCollectionHandle(url),
        timestamp,
      }
      allPages.push(pageRecord)

      // Categorize
      if (pageType === 'product') {
        products.push(pageRecord)
      } else if (pageType === 'collection') {
        collections.push(pageRecord)
      }

      // Image manifest
      if (pageType === 'product') {
        const productImages = images.filter(img => 
          img.src.includes('cdn.shopify.com') || img.src.includes('shopify')
        )
        allImages.push(...productImages.map(img => ({
          ...img,
          productUrl: url,
          productHandle: extractProductHandle(url),
        })))
      }

      // Screenshot
      if (TAKE_SCREENSHOTS) {
        const safeName = url.replace(/https?:\/\//, '').replace(/[\/?#]/g, '_').substring(0, 120)
        const screenshotPath = path.join(SCREENSHOTS_DIR, `${safeName}.png`)
        await page.screenshot({ path: screenshotPath, fullPage: true })
        screenshotMap[url] = screenshotPath

        // Analyze screenshot with Ollama
        await analyzeScreenshot(screenshotPath, url, pageType)
      }

      // Save raw HTML
      const safeFile = url.replace(/https?:\/\//, '').replace(/[\/?#]/g, '_').substring(0, 120)
      const html = await page.content()
      fs.writeFileSync(path.join(RAW_DIR, `${safeFile}.html`), html)

      // Discover links
      const links = getLinksFromPage(page, url)
      const internalLinks = [...new Set(links.filter(l => shouldVisit(l, START_URL)))]
      
      // Check for broken links
      for (const link of links) {
        if (isInternalUrl(link, START_URL) && !link.startsWith('#')) {
          try {
            const resp = await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 5000 })
            if (resp && resp.status() >= 400) {
              brokenLinks.push({ source: url, target: link, status: resp.status() })
            }
          } catch {
            brokenLinks.push({ source: url, target: link, status: 0 })
          }
        }
      }

      // Add to queue
      for (const link of internalLinks) {
        if (!visited.has(link)) {
          queue.push(link)
        }
      }

      pagesScanned++
      
      // Delay to be respectful
      if (queue.length > 0 && PAGE_DELAY > 0) {
        await new Promise(r => setTimeout(r, PAGE_DELAY))
      }

    } catch (err) {
      console.warn(`  ❌ Error scanning ${url}: ${err.message}`)
      brokenLinks.push({ source: url, target: url, status: -1, error: err.message })
    }
  }

  await browser.close()

  // =============================================
  // Save Results
  // =============================================
  console.log('\n💾 Saving results...')

  // Full page data
  fs.writeFileSync(path.join(DATA_DIR, 'all-pages.json'), JSON.stringify(allPages, null, 2))
  fs.writeFileSync(path.join(DATA_DIR, 'products.json'), JSON.stringify(products, null, 2))
  fs.writeFileSync(path.join(DATA_DIR, 'collections.json'), JSON.stringify(collections, null, 2))
  fs.writeFileSync(path.join(DATA_DIR, 'seo-metadata.json'), JSON.stringify(seoData, null, 2))
  fs.writeFileSync(path.join(DATA_DIR, 'all-images.json'), JSON.stringify(allImages, null, 2))
  fs.writeFileSync(path.join(DATA_DIR, 'broken-links.json'), JSON.stringify(brokenLinks, null, 2))
  
  // Summary report
  const summary = {
    scanDate: new Date().toISOString(),
    startUrl: START_URL,
    pagesScanned: allPages.length,
    productsFound: products.length,
    collectionsFound: collections.length,
    totalImages: allImages.length,
    seoRecords: seoData.length,
    brokenLinks: brokenLinks.filter(l => l.status >= 400).length,
    pagesByType: {},
    screenshotCount: Object.keys(screenshotMap).length,
    ollamaEnabled: USE_OLLAMA,
  }
  allPages.forEach(p => {
    summary.pagesByType[p.type] = (summary.pagesByType[p.type] || 0) + 1
  })
  
  fs.writeFileSync(path.join(DATA_DIR, 'scan-summary.json'), JSON.stringify(summary, null, 2))

  // =============================================
  // Print Summary
  // =============================================
  console.log('\n' + '='.repeat(50))
  console.log('📊 SCAN COMPLETE')
  console.log('='.repeat(50))
  console.log(`   Pages scanned:    ${summary.pagesScanned}`)
  console.log(`   Products found:   ${summary.productsFound}`)
  console.log(`   Collections:      ${summary.collectionsFound}`)
  console.log(`   SEO records:      ${summary.seoRecords}`)
  console.log(`   Unique images:    ${summary.totalImages}`)
  console.log(`   Screenshots:      ${summary.screenshotCount}`)
  console.log(`   Broken links:     ${summary.brokenLinks}`)
  console.log('')
  for (const [type, count] of Object.entries(summary.pagesByType)) {
    console.log(`   ${type.padEnd(15)} ${count}`)
  }
  console.log('')
  console.log(`📁 Output: ${CUSTOM_OUTPUT}`)
  console.log('')
  
  // Save to shopify-import/output as well for the migration pipeline
  const sharedOutput = path.resolve(__dirname, '..', 'shopify-import', 'output')
  fs.mkdirSync(sharedOutput, { recursive: true })
  fs.writeFileSync(path.join(sharedOutput, 'payload-products.json'), JSON.stringify(products, null, 2))
  fs.writeFileSync(path.join(sharedOutput, 'payload-pages.json'), JSON.stringify(
    allPages.filter(p => p.type === 'page'), null, 2))
  fs.writeFileSync(path.join(sharedOutput, 'seo-metadata.json'), JSON.stringify(seoData, null, 2))
  
  console.log('✅ Results saved to:')
  console.log(`   ${DATA_DIR}/`)
  console.log(`   ${SCREENSHOTS_DIR}/ (${summary.screenshotCount} screenshots)`)
  console.log(`   ${RAW_DIR}/ (raw HTML)`)
  if (USE_OLLAMA) {
    console.log(`   ${SCREENSHOTS_DIR}/ (Ollama vision analyses)`)
  }
}

scan().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
