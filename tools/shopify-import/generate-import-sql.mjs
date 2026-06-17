#!/usr/bin/env node
/**
 * generate-import-sql.mjs
 *
 * Reads DaVinciOS-products.json + DaVinciOS-categories.json and emits a
 * single SQL file ready to pipe into psql.
 *
 * Filters: status=ACTIVE AND has at least 1 image (659 live products).
 *
 * Usage:
 *   node tools/shopify-import/generate-import-sql.mjs > /tmp/homeu-import.sql
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, 'output')

const products = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'DaVinciOS-products.json'), 'utf-8'))
const categories = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'DaVinciOS-categories.json'), 'utf-8'))

// Escape a JS string for safe SQL single-quote literal
function sq(v) {
  if (v == null) return 'NULL'
  return `'${String(v).replace(/'/g, "''")}'`
}

function sqJson(v) {
  if (v == null) return 'NULL'
  return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`
}

const lines = []

lines.push(`-- HomeU Product Import — generated ${new Date().toISOString()}`)
lines.push(`-- 659 live products (ACTIVE + has images)`)
lines.push(`SET client_min_messages TO WARNING;`)
lines.push(``)

// ─── Schema patches ──────────────────────────────────────────────────────────
lines.push(`-- Patch categories: add image_url if missing`)
lines.push(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url VARCHAR;`)
lines.push(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS shopify_id VARCHAR;`)
lines.push(``)
lines.push(`-- Patch products: add shopify_id if missing`)
lines.push(`ALTER TABLE products ADD COLUMN IF NOT EXISTS shopify_id VARCHAR;`)
lines.push(`ALTER TABLE products ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active';`)
lines.push(`ALTER TABLE products ADD COLUMN IF NOT EXISTS vendor VARCHAR;`)
lines.push(`ALTER TABLE products ADD COLUMN IF NOT EXISTS tags JSONB;`)
lines.push(``)

// ─── product_images table ────────────────────────────────────────────────────
lines.push(`-- Create product_images table if not exists`)
lines.push(`CREATE TABLE IF NOT EXISTS product_images (`)
lines.push(`  id          SERIAL PRIMARY KEY,`)
lines.push(`  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,`)
lines.push(`  url         VARCHAR NOT NULL,`)
lines.push(`  alt         VARCHAR,`)
lines.push(`  width       INTEGER,`)
lines.push(`  height      INTEGER,`)
lines.push(`  sort_order  INTEGER NOT NULL DEFAULT 0,`)
lines.push(`  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()`)
lines.push(`);`)
lines.push(`CREATE INDEX IF NOT EXISTS product_images_product_idx ON product_images(product_id);`)
lines.push(`CREATE INDEX IF NOT EXISTS product_images_sort_idx ON product_images(product_id, sort_order);`)
lines.push(``)

// ─── Categories upsert ───────────────────────────────────────────────────────
lines.push(`-- ── Categories (${categories.length}) ─────────────────────────────`)
for (const cat of categories) {
  const title = sq(cat.title)
  const slug = sq(cat.slug)
  const desc = sq(cat.description || '')
  const imgUrl = sq(cat.image?.src || cat.imageUrl || null)
  const shopifyId = sq(cat.shopifyId || null)
  const seoTitle = sq(cat.seoTitle || cat.title)
  const seoDesc = sq(cat.seoDescription || '')
  const shopifyUrl = sq(cat.shopifyOriginalUrl || null)

  lines.push(`INSERT INTO categories (title, slug, description, image_url, shopify_id, seo_title, seo_description, shopify_original_url, updated_at, created_at)`)
  lines.push(`  VALUES (${title}, ${slug}, ${desc}, ${imgUrl}, ${shopifyId}, ${seoTitle}, ${seoDesc}, ${shopifyUrl}, now(), now())`)
  lines.push(`  ON CONFLICT (slug) DO UPDATE SET`)
  lines.push(`    title=${title}, description=${desc}, image_url=${imgUrl},`)
  lines.push(`    shopify_id=${shopifyId}, seo_title=${seoTitle}, seo_description=${seoDesc},`)
  lines.push(`    shopify_original_url=${shopifyUrl}, updated_at=now();`)
}
lines.push(``)

// ─── Products upsert ─────────────────────────────────────────────────────────
// Only ACTIVE + has images (already filtered by transform script)
const liveProducts = products.filter(p => p.status === 'ACTIVE' && p.images?.length > 0)
lines.push(`-- ── Products (${liveProducts.length} live with images) ──────────────`)

for (const p of liveProducts) {
  const title = sq(p.title)
  const slug = sq(p.slug)
  const shopifyId = sq(p.shopifyId || null)
  const sku = sq(p.sku || null)
  const price = p.price != null ? p.price : 'NULL'
  const salePrice = p.salePrice != null ? p.salePrice : 'NULL'
  const showPrice = p.showPrice ? 'true' : 'false'
  const description = sqJson(p.description || '')
  const vendor = sq(p.vendor || null)
  const tags = p.tags?.length ? sqJson(p.tags) : 'NULL'
  const seoTitle = sq(p.seoTitle || p.title)
  const seoDesc = sq((p.seoDescription || '').substring(0, 320))
  const shopifyUrl = sq(p.shopifyUrl || null)
  const status = sq('active')
  // category: use first handle, look it up with a subquery
  const firstCat = p.categoryHandles?.[0]
  const catIdExpr = firstCat
    ? `(SELECT id FROM categories WHERE slug = ${sq(firstCat)} LIMIT 1)`
    : 'NULL'

  lines.push(`INSERT INTO products (title, slug, shopify_id, sku, price, sale_price, show_price, description, vendor, tags, category_id, seo_title, seo_description, shopify_original_url, status, updated_at, created_at)`)
  lines.push(`  VALUES (${title}, ${slug}, ${shopifyId}, ${sku}, ${price}, ${salePrice}, ${showPrice}, ${description}, ${vendor}, ${tags}, ${catIdExpr}, ${seoTitle}, ${seoDesc}, ${shopifyUrl}, ${status}, now(), now())`)
  lines.push(`  ON CONFLICT (slug) DO UPDATE SET`)
  lines.push(`    title=${title}, shopify_id=${shopifyId}, sku=${sku},`)
  lines.push(`    price=${price}, sale_price=${salePrice}, show_price=${showPrice},`)
  lines.push(`    description=${description}, vendor=${vendor}, tags=${tags},`)
  lines.push(`    category_id=${catIdExpr}, seo_title=${seoTitle},`)
  lines.push(`    seo_description=${seoDesc}, shopify_original_url=${shopifyUrl},`)
  lines.push(`    status=${status}, updated_at=now();`)
}
lines.push(``)

// ─── Product images upsert ───────────────────────────────────────────────────
lines.push(`-- ── Product images ─────────────────────────────────────────────`)
lines.push(`-- Wipe existing images for these products then re-insert (clean slate)`)
const slugList = liveProducts.map(p => sq(p.slug)).join(', ')
lines.push(`DELETE FROM product_images WHERE product_id IN (`)
lines.push(`  SELECT id FROM products WHERE slug IN (${slugList})`)
lines.push(`);`)
lines.push(``)

for (const p of liveProducts) {
  for (let i = 0; i < p.images.length; i++) {
    const img = p.images[i]
    const url = sq(img.src)
    const alt = sq(img.alt || p.title)
    const w = img.width ?? 'NULL'
    const h = img.height ?? 'NULL'
    const pidExpr = `(SELECT id FROM products WHERE slug = ${sq(p.slug)} LIMIT 1)`
    lines.push(`INSERT INTO product_images (product_id, url, alt, width, height, sort_order)`)
    lines.push(`  VALUES (${pidExpr}, ${url}, ${alt}, ${w}, ${h}, ${i});`)
  }
}
lines.push(``)

// ─── Verification query ──────────────────────────────────────────────────────
lines.push(`-- ── Verification ────────────────────────────────────────────────`)
lines.push(`SELECT`)
lines.push(`  (SELECT COUNT(*) FROM products WHERE status = 'active') AS live_products,`)
lines.push(`  (SELECT COUNT(*) FROM product_images) AS total_images,`)
lines.push(`  (SELECT COUNT(DISTINCT product_id) FROM product_images) AS products_with_images,`)
lines.push(`  (SELECT COUNT(*) FROM categories) AS total_categories;`)

const sql = lines.join('\n')

const OUTPUT_SQL = path.join(OUT_DIR, 'homeu-import.sql')
fs.writeFileSync(OUTPUT_SQL, sql, { encoding: 'utf8' })

const imgCount = liveProducts.reduce((s, p) => s + p.images.length, 0)
console.log(`✅ Generated SQL → ${OUTPUT_SQL}`)
console.log(`   Products  : ${liveProducts.length}`)
console.log(`   Images    : ${imgCount}`)
console.log(`   Categories: ${categories.length}`)
console.log(`   File size : ${(fs.statSync(OUTPUT_SQL).size / 1024).toFixed(0)} KB`)
