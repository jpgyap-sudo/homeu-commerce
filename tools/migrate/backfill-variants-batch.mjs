#!/usr/bin/env node
/**
 * One-off backfill: inserts product_variants rows from a batch of Shopify
 * GraphQL productByIdentifier responses (aliased p0, p1, ... keys), matched
 * to our products table by slug == Shopify handle.
 *
 * Usage: node tools/migrate/backfill-variants-batch.mjs <path-to-batch.json>
 * Expects DATABASE_URI in env. Skips any product that already has variant
 * rows (idempotent — safe to re-run on the same batch file).
 */
import { readFileSync } from 'fs'
import pg from 'pg'

const file = process.argv[2]
if (!file) {
  console.error('Usage: node backfill-variants-batch.mjs <batch.json>')
  process.exit(1)
}

const connectionString = process.env.DATABASE_URI || 'postgres://homeu:homeu@localhost:5432/homeu'
const pool = new pg.Pool({ connectionString, max: 1 })

const batch = JSON.parse(readFileSync(file, 'utf8'))
const entries = Object.values(batch.data).filter(Boolean)

let inserted = 0
let skippedExisting = 0
let skippedNotFound = 0

for (const product of entries) {
  const { handle, title: productTitle, variants } = product
  const edges = variants?.edges || []
  if (edges.length === 0) continue

  const productRes = await pool.query('SELECT id FROM products WHERE slug = $1 LIMIT 1', [handle])
  if (productRes.rowCount === 0) {
    console.log(`  SKIP (not in our DB): ${handle}`)
    skippedNotFound++
    continue
  }
  const productId = productRes.rows[0].id

  const existing = await pool.query('SELECT COUNT(*) FROM product_variants WHERE product_id = $1', [productId])
  if (parseInt(existing.rows[0].count) > 0) {
    console.log(`  SKIP (already has variants): ${handle}`)
    skippedExisting++
    continue
  }

  for (let i = 0; i < edges.length; i++) {
    const v = edges[i].node
    const sellingPrice = parseFloat(v.price)
    const compareAt = v.compareAtPrice ? parseFloat(v.compareAtPrice) : null
    const hasDiscount = compareAt !== null && compareAt > sellingPrice
    const price = hasDiscount ? compareAt : sellingPrice
    const salePrice = hasDiscount ? sellingPrice : null

    await pool.query(
      `INSERT INTO product_variants (product_id, title, sku, price, sale_price, inventory_quantity, sort_order, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        productId,
        v.title,
        v.sku || null,
        price,
        salePrice,
        Math.max(0, v.inventoryQuantity || 0),
        v.position - 1,
        v.position === 1,
      ]
    )
    inserted++
  }
  console.log(`  OK: ${handle} (${productTitle}) — ${edges.length} variants`)
}

console.log(`\nInserted ${inserted} variant rows. Skipped ${skippedExisting} (already had variants), ${skippedNotFound} (not in our DB).`)
await pool.end()
