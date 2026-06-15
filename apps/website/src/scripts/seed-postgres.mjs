/**
 * Seed Postgres (categories -> pages -> products) directly from the
 * transformed Shopify export in tools/shopify-import/output/.
 *
 * Bypasses DaVinciOS's Local API (blocked by a DaVinciOS@3.85 / @next/env@16
 * ESM interop bug) and writes straight to the tables DaVinciOS's
 * postgres adapter already created, matching apps/website/src/collections/*.
 *
 * Usage: node src/scripts/seed-postgres.mjs [--limit N]
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
  if (!fs.existsSync(filepath)) return null
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'))
}

// ── Minimal HTML -> Lexical converter ──────────────────────────────

function decodeEntities(str) {
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8217;/g, '’')
    .replace(/&#8211;/g, '–')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”')
}

function stripTags(html) {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\s*\n\s*/g, '\n')
      .trim(),
  )
}

function textNode(text) {
  return { type: 'text', detail: 0, format: 0, mode: 'normal', style: '', text, version: 1 }
}

function paragraphNode(children) {
  return {
    type: 'paragraph',
    children,
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
    textFormat: 0,
    textStyle: '',
  }
}

function headingNode(tag, children) {
  return { type: 'heading', tag, children, direction: 'ltr', format: '', indent: 0, version: 1 }
}

function listNode(listType, tag, children) {
  return {
    type: 'list',
    tag,
    listType,
    start: 1,
    children,
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  }
}

function listItemNode(children, value) {
  return { type: 'listitem', value, children, direction: 'ltr', format: '', indent: 0, version: 1 }
}

function rootNode(children) {
  return {
    root: {
      type: 'root',
      children: children.length ? children : [paragraphNode([])],
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  }
}

function htmlToLexical(html) {
  if (!html || !html.trim()) return rootNode([])

  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')

  const children = []
  const blockRegex =
    /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>|<(ul|ol)[^>]*>([\s\S]*?)<\/\3>|<p[^>]*>([\s\S]*?)<\/p>|<div[^>]*>([\s\S]*?)<\/div>/gi

  let match
  let found = false
  while ((match = blockRegex.exec(cleaned)) !== null) {
    found = true
    if (match[1]) {
      const text = stripTags(match[2])
      if (text) children.push(headingNode(`h${match[1]}`, [textNode(text)]))
    } else if (match[3]) {
      const listType = match[3].toLowerCase() === 'ol' ? 'number' : 'bullet'
      const items = [...match[4].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
        .map((m) => stripTags(m[1]))
        .filter(Boolean)
      if (items.length) {
        children.push(
          listNode(
            listType,
            match[3].toLowerCase(),
            items.map((t, i) => listItemNode([textNode(t)], i + 1)),
          ),
        )
      }
    } else if (match[5] !== undefined) {
      const text = stripTags(match[5])
      if (text) children.push(paragraphNode([textNode(text)]))
    } else if (match[6] !== undefined) {
      const text = stripTags(match[6])
      if (text) children.push(paragraphNode([textNode(text)]))
    }
  }

  if (!found) {
    const text = stripTags(cleaned)
    if (text) children.push(paragraphNode([textNode(text)]))
  }

  return rootNode(children)
}

// ── Seed ────────────────────────────────────────────────────────────

async function main() {
  loadEnv()

  const limitArgIdx = process.argv.indexOf('--limit')
  const limit = limitArgIdx !== -1 ? parseInt(process.argv[limitArgIdx + 1], 10) : Infinity

  const client = new pg.Client({ connectionString: process.env.DATABASE_URI })
  await client.connect()

  const categories = loadJSON('DaVinciOS-categories.json') ?? []
  const pages = loadJSON('DaVinciOS-pages.json') ?? []
  const products = loadJSON('DaVinciOS-products.json') ?? []

  // 1. Categories
  console.log(`\n=== Categories (${categories.length}) ===`)
  const categoryIdByHandle = new Map()
  for (const c of categories) {
    const res = await client.query(
      `INSERT INTO categories (title, slug, description, seo_title, seo_description, shopify_original_url, updated_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now(), now())
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         seo_title = EXCLUDED.seo_title,
         seo_description = EXCLUDED.seo_description,
         shopify_original_url = EXCLUDED.shopify_original_url,
         updated_at = now()
       RETURNING id`,
      [c.title, c.slug, c.description || '', c.seoTitle || '', c.seoDescription || '', c.shopifyOriginalUrl || ''],
    )
    categoryIdByHandle.set(c.slug, res.rows[0].id)
  }
  console.log(`  upserted ${categoryIdByHandle.size}`)

  // 2. Pages
  console.log(`\n=== Pages (${pages.length}) ===`)
  let pageCount = 0
  for (const p of pages) {
    if (!p.title || !p.slug) continue // skip records not in the Shopify-export shape
    await client.query(
      `INSERT INTO pages (title, slug, content, seo_title, seo_description, shopify_original_url, updated_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now(), now())
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title,
         content = EXCLUDED.content,
         seo_title = EXCLUDED.seo_title,
         seo_description = EXCLUDED.seo_description,
         shopify_original_url = EXCLUDED.shopify_original_url,
         updated_at = now()`,
      [p.title, p.slug, JSON.stringify(htmlToLexical(p.content)), p.seoTitle || '', p.seoDescription || '', p.shopifyOriginalUrl || ''],
    )
    pageCount++
  }
  console.log(`  upserted ${pageCount}`)

  // 3. Products
  const productsToSeed = Number.isFinite(limit) ? products.slice(0, limit) : products
  console.log(`\n=== Products (${productsToSeed.length} of ${products.length}) ===`)
  let prodCount = 0
  for (const p of productsToSeed) {
    const categoryHandle = (p.categoryHandles || [])[0]
    const categoryId = categoryHandle ? categoryIdByHandle.get(categoryHandle) ?? null : null

    await client.query(
      `INSERT INTO products (title, slug, sku, price, sale_price, show_price, description, category_id, seo_title, seo_description, shopify_original_url, updated_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now(), now())
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title,
         sku = EXCLUDED.sku,
         price = EXCLUDED.price,
         sale_price = EXCLUDED.sale_price,
         show_price = EXCLUDED.show_price,
         description = EXCLUDED.description,
         category_id = EXCLUDED.category_id,
         seo_title = EXCLUDED.seo_title,
         seo_description = EXCLUDED.seo_description,
         shopify_original_url = EXCLUDED.shopify_original_url,
         updated_at = now()`,
      [
        p.title,
        p.slug,
        p.sku || '',
        p.price ?? null,
        p.salePrice ?? null,
        p.showPrice ?? true,
        JSON.stringify(htmlToLexical(p.description)),
        categoryId,
        p.seoTitle || '',
        p.seoDescription || '',
        p.shopifyOriginalUrl || p.shopifyUrl || '',
      ],
    )
    prodCount++
    if (prodCount % 250 === 0 || prodCount === productsToSeed.length) {
      console.log(`  progress: ${prodCount}/${productsToSeed.length}`)
    }
  }
  console.log(`  upserted ${prodCount}`)

  await client.end()
  console.log('\n✅ Seed complete')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
