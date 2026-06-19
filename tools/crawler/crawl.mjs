#!/usr/bin/env node
/**
 * HomeU Site Crawler
 *
 * Crawls a target site (default: localhost:3000) to discover all URLs,
 * pages, collections, products, blogs. Detects broken links, tracks HTTP
 * status codes, and generates structured output.
 *
 * Usage:
 *   node crawl.mjs                          # crawl localhost:3000
 *   node crawl.mjs --url=https://store.homeatelier.ph  # crawl remote
 *   node crawl.mjs --max=500                 # max 500 pages
 *   node crawl.mjs --delay=2000              # 2s delay between requests
 *   node crawl.mjs --no-js                   # skip JS-rendering checks
 *   node crawl.mjs --quick                   # homepage + nav only
 */

import { writeFileSync, mkdirSync, existsSync, appendFileSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = join(__dirname, 'output')
const ROOT = join(__dirname, '..', '..')
const TASK_LOG = join(ROOT, 'memory', 'task-log.jsonl')

// Ensure output directory
mkdirSync(OUTPUT_DIR, { recursive: true })

// ── Configuration ──────────────────────────────────────────────────────
const config = {
  baseUrl: 'http://localhost:3000',
  maxPages: 1000,
  delayMs: 500,           // ms between requests
  timeout: 15000,         // request timeout
  maxRetries: 2,          // retry failed requests
  respectDelay: true,     // honor crawl-delay from robots.txt
  checkRobots: true,      // parse robots.txt
  followExternal: false,  // don't follow links to other domains
  quickMode: false,       // homepage + nav only
  jsMode: true,           // check for JS-rendered links
  userAgent: 'HomeU-Crawler/1.0 (+https://homeu.ph)',
}

// Parse CLI args
const args = process.argv.slice(2)
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--url' && args[i + 1]) config.baseUrl = args[++i]
  else if (args[i] === '--max' && args[i + 1]) config.maxPages = parseInt(args[++i])
  else if (args[i] === '--delay' && args[i + 1]) config.delayMs = parseInt(args[++i])
  else if (args[i] === '--no-js') config.jsMode = false
  else if (args[i] === '--quick') config.quickMode = true
}

// ── State ─────────────────────────────────────────────────────────────
const visited = new Set()
const queue = []                     // URLs to visit
const results = []                   // all crawl results
const brokenLinks = []               // 4xx/5xx URLs
const externalLinks = []             // external URLs found
const redirects = []                 // redirect chains
let totalBytes = 0
let startTime = Date.now()

const baseHost = new URL(config.baseUrl).hostname

// ── Helpers ───────────────────────────────────────────────────────────
function normalizeUrl(url, parentUrl) {
  try {
    const resolved = new URL(url, parentUrl || config.baseUrl)
    // Remove hash
    resolved.hash = ''
    // Remove trailing slash for consistency (except root)
    let normalized = resolved.href
    if (normalized.endsWith('/') && resolved.pathname !== '/') {
      normalized = normalized.slice(0, -1)
    }
    return normalized
  } catch {
    return null
  }
}

function isInternal(url) {
  try {
    const host = new URL(url).hostname
    return host === baseHost || host === 'localhost' || host === '127.0.0.1'
  } catch {
    return false
  }
}

function isPageUrl(url) {
  // Skip non-HTML resources
  const skipExt = /\.(css|js|json|xml|ico|png|jpg|jpeg|gif|svg|webp|avif|woff2?|ttf|eot|pdf|zip|gz|mp4|webm)$/i
  return !skipExt.test(url)
}

function extractLinks(html, parentUrl) {
  const links = new Set()
  // <a href="...">
  const aRegex = /<a\s[^>]*href=["']([^"']+)["']/gi
  let match
  while ((match = aRegex.exec(html)) !== null) {
    const href = match[1].trim()
    if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
      links.add(href)
    }
  }
  // <link href="..."> — for canonical, next, prev
  const linkRegex = /<link\s[^>]*href=["']([^"']+)["']/gi
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1].trim()
    if (href && href.startsWith('/') || href.startsWith('http')) {
      links.add(href)
    }
  }
  return [...links]
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ── Robots.txt ─────────────────────────────────────────────────────────
let disallowedPaths = []
async function loadRobots() {
  if (!config.checkRobots) return
  try {
    const res = await fetch(`${config.baseUrl}/robots.txt`, {
      headers: { 'User-Agent': config.userAgent },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return
    const text = await res.text()
    const lines = text.split('\n')
    let inOurBlock = false
    for (const line of lines) {
      const trimmed = line.trim().toLowerCase()
      if (trimmed.startsWith('user-agent:')) {
        const agent = trimmed.split(':')[1]?.trim() || ''
        inOurBlock = (agent === '*' || agent === 'homeu-crawler')
      } else if (inOurBlock && trimmed.startsWith('disallow:')) {
        const path = trimmed.split(':')[1]?.trim() || ''
        if (path) disallowedPaths.push(path)
      } else if (inOurBlock && trimmed.startsWith('crawl-delay:')) {
        const delay = parseInt(trimmed.split(':')[1]?.trim() || '0')
        if (delay > 0 && config.respectDelay) {
          config.delayMs = Math.max(config.delayMs, delay * 1000)
        }
      } else if (trimmed === '') {
        inOurBlock = false
      }
    }
    console.log(`  🤖 robots.txt: ${disallowedPaths.length} disallowed paths, delay=${config.delayMs}ms`)
  } catch (e) {
    // robots.txt not available — crawl freely
  }
}

function isDisallowed(url) {
  try {
    const path = new URL(url).pathname
    return disallowedPaths.some(d => path.startsWith(d))
  } catch {
    return false
  }
}

// ── Crawler ────────────────────────────────────────────────────────────
async function crawlUrl(url, referrer = '') {
  if (visited.has(url)) return
  if (!isInternal(url)) {
    if (!config.followExternal) {
      externalLinks.push({ url, referrer, foundAt: new Date().toISOString() })
      return
    }
  }
  if (isDisallowed(url)) {
    console.log(`  ⛔ Disallowed by robots.txt: ${url}`)
    return
  }
  visited.add(url)
  queue.push(url)
}

async function fetchPage(url) {
  let lastError = null
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), config.timeout)
      const res = await fetch(url, {
        headers: { 'User-Agent': config.userAgent },
        signal: controller.signal,
        redirect: 'manual',
      })
      clearTimeout(timeout)

      // Track redirects
      if ([301, 302, 307, 308].includes(res.status)) {
        const location = res.headers.get('location')
        if (location) {
          redirects.push({ from: url, to: location, status: res.status })
          const resolved = normalizeUrl(location, url)
          if (resolved && !visited.has(resolved)) {
            await crawlUrl(resolved, url)
          }
        }
        return { status: res.status, contentType: '', size: 0, links: [] }
      }

      const contentType = res.headers.get('content-type') || ''
      const isHtml = contentType.includes('text/html') || contentType.includes('application/xhtml')
      
      let size = 0
      let links = []
      
      if (isHtml) {
        const html = await res.text()
        size = Buffer.byteLength(html, 'utf8')
        links = extractLinks(html, url)
      } else {
        size = parseInt(res.headers.get('content-length') || '0') || 0
      }

      totalBytes += size
      return { status: res.status, contentType, size, links, isHtml }
    } catch (e) {
      lastError = e
      if (attempt < config.maxRetries) {
        console.log(`  ⚠ Retry ${attempt + 1}/${config.maxRetries}: ${url} — ${e.message}`)
        await sleep(config.delayMs * 2)
      }
    }
  }
  return { status: 0, contentType: '', size: 0, links: [], error: lastError?.message || 'Unknown error' }
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  console.log('════════════════════════════════════════════════')
  console.log('  HomeU Site Crawler')
  console.log('════════════════════════════════════════════════')
  console.log(`  Target: ${config.baseUrl}`)
  console.log(`  Max pages: ${config.maxPages}`)
  console.log(`  Delay: ${config.delayMs}ms`)
  console.log(`  Mode: ${config.quickMode ? 'QUICK' : 'FULL'}`)
  console.log('')

  // Load robots.txt
  await loadRobots()

  // Seed with homepage
  await crawlUrl(config.baseUrl, 'seed')

  let crawled = 0
  const breadcrumbs = new Set()  // URL path segments for discovery

  while (queue.length > 0 && crawled < config.maxPages) {
    const url = queue.shift()
    if (!url) continue

    console.log(`[${crawled + 1}/${Math.min(config.maxPages, queue.length + crawled + 1)}] ${url}`)

    const result = await fetchPage(url)
    
    const entry = {
      url,
      status: result.status,
      contentType: result.contentType,
      size: result.size,
      crawledAt: new Date().toISOString(),
      error: result.error || null,
    }
    results.push(entry)

    // Track broken links
    if (result.status >= 400 || result.status === 0) {
      brokenLinks.push(entry)
      console.log(`  ❌ ${result.status} ${result.error || ''}`)
    }

    crawled++

    // Process links
    if (result.links && result.links.length > 0) {
      for (const rawLink of result.links) {
        const normalized = normalizeUrl(rawLink, url)
        if (!normalized) continue
        if (visited.has(normalized)) continue
        if (!isPageUrl(normalized)) continue

        // In quick mode, only follow nav + products + collections
        if (config.quickMode) {
          const path = new URL(normalized).pathname
          const allowed = ['/products/', '/collections/', '/blog/', '/pages/', '/admin/']
          if (!allowed.some(p => path.startsWith(p)) && path !== '/' && path !== '' && !path.startsWith('/products') && !path.startsWith('/collections')) {
            continue
          }
        }

        // Extract breadcrumbs for discovery
        try {
          const path = new URL(normalized).pathname
          const segments = path.split('/').filter(Boolean)
          if (segments.length > 0) {
            breadcrumbs.add('/' + segments[0])
          }
        } catch {}

        await crawlUrl(normalized, url)
      }
    }

    // Respect rate limit
    if (queue.length > 0) {
      await sleep(config.delayMs)
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1)

  // ── Generate Outputs ──────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════')
  console.log('  Generating Reports')
  console.log('════════════════════════════════════════════════')

  // all-urls.txt — flat list
  const allUrls = results.map(r => `${r.status} ${r.url}`).join('\n')
  writeFileSync(join(OUTPUT_DIR, 'all-urls.txt'), allUrls, 'utf8')
  console.log(`  ✅ all-urls.txt — ${results.length} URLs`)

  // sitemap.txt — only 200 OK pages
  const okUrls = results.filter(r => r.status === 200).map(r => r.url)
  writeFileSync(join(OUTPUT_DIR, 'sitemap.txt'), okUrls.join('\n'), 'utf8')
  console.log(`  ✅ sitemap.txt — ${okUrls.length} OK pages`)

  // crawl-report.json — structured
  const report = {
    crawlDate: new Date().toISOString(),
    target: config.baseUrl,
    durationSeconds: parseFloat(duration),
    summary: {
      totalCrawled: results.length,
      totalOk: okUrls.length,
      totalRedirects: redirects.length,
      totalBroken: brokenLinks.length,
      totalExternal: externalLinks.length,
      totalBytes,
      queueRemaining: queue.length,
    },
    statusCodes: {},
    brokenLinks,
    redirects,
    externalLinks,
    results,
  }

  // Count status codes
  for (const r of results) {
    report.statusCodes[r.status] = (report.statusCodes[r.status] || 0) + 1
  }

  writeFileSync(join(OUTPUT_DIR, 'crawl-report.json'), JSON.stringify(report, null, 2), 'utf8')
  console.log(`  ✅ crawl-report.json — ${JSON.stringify(report).length} bytes`)

  // ── Log to central-logger ─────────────────────────────────────────
  try {
    if (existsSync(TASK_LOG)) {
      const taskEntry = {
        timestamp: new Date().toISOString(),
        agent: 'crawler',
        status: 'completed',
        summary: `Site crawl complete: ${results.length} pages (${okUrls.length} OK, ${brokenLinks.length} broken, ${redirects.length} redirects, ${externalLinks.length} external). ${(totalBytes / 1024 / 1024).toFixed(1)}MB transferred in ${duration}s.`,
        files: ['tools/crawler/output/all-urls.txt', 'tools/crawler/output/sitemap.txt', 'tools/crawler/output/crawl-report.json'],
        verification: `Crawled ${results.length} URLs with ${config.delayMs}ms delay. ${brokenLinks.length} broken links found.`,
      }
      appendFileSync(TASK_LOG, JSON.stringify(taskEntry) + '\n', 'utf8')
      console.log('  ✅ Task logged to central-logger')
    }
  } catch {}

  // ── Log broken links to bug-log ──────────────────────────────────
  if (brokenLinks.length > 0) {
    try {
      const bugLog = join(ROOT, 'memory', 'bug-log.jsonl')
      for (const b of brokenLinks) {
        const entry = {
          timestamp: new Date().toISOString(),
          agent: 'crawler',
          status: 'found',
          summary: `Broken link: ${b.url} returned ${b.status}${b.error ? ' — ' + b.error : ''}`,
          severity: b.status >= 500 ? 'high' : 'medium',
          files: [b.url],
          verification: `Crawler detected HTTP ${b.status} at ${b.crawledAt}`,
        }
        appendFileSync(bugLog, JSON.stringify(entry) + '\n', 'utf8')
      }
      console.log(`  ✅ ${brokenLinks.length} broken links logged to bug-log`)
    } catch {}
  }

  // ── Summary ─────────────────────────────────────────────────────
  console.log('')
  console.log('════════════════════════════════════════════════')
  console.log('  Crawl Summary')
  console.log('════════════════════════════════════════════════')
  console.log(`  Total crawled:   ${results.length}`)
  console.log(`  OK (200):        ${okUrls.length}`)
  console.log(`  Broken (4xx/5xx): ${brokenLinks.length}`)
  console.log(`  Redirects (3xx): ${redirects.length}`)
  console.log(`  External links:  ${externalLinks.length}`)
  console.log(`  Data transferred: ${(totalBytes / 1024 / 1024).toFixed(1)} MB`)
  console.log(`  Duration:        ${duration}s`)
  console.log(`  Queue remaining: ${queue.length}`)
  console.log('')
  console.log(`  Reports: ${OUTPUT_DIR}/`)
  console.log('════════════════════════════════════════════════')

  if (brokenLinks.length > 0) {
    console.log('\n⚠ Broken Links:')
    for (const b of brokenLinks.slice(0, 10)) {
      console.log(`  ${b.status} ${b.url}`)
    }
    if (brokenLinks.length > 10) console.log(`  ... and ${brokenLinks.length - 10} more`)
  }
}

main().catch(err => {
  console.error('Crawler failed:', err.message)
  process.exit(1)
})
