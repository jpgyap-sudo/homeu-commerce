#!/usr/bin/env node
/**
 * generate-membership-sql.mjs
 *
 * Populates collection_products (many-to-many) from each live product's
 * full Shopify collection handle list (captured in DaVinciOS-products.json
 * as categoryHandles). This is the real, ground-truth membership from the
 * Shopify bulk export — no re-crawl needed.
 *
 * Only links to collections that exist in our `categories` table (matched
 * by slug = handle). App-utility handles (recommended-products-seguno,
 * globofilter-*, all, etc.) that aren't real merchandising collections are
 * skipped automatically because no category row matches them.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'output')

const products = JSON.parse(fs.readFileSync(path.join(OUT, 'DaVinciOS-products.json'), 'utf-8'))
const live = products.filter(p => p.status === 'ACTIVE' && p.images?.length > 0)

const sq = (v) => `'${String(v).replace(/'/g, "''")}'`

const lines = []
lines.push(`-- Populate collection_products from Shopify-export membership`)
lines.push(`-- ${new Date().toISOString()}`)
lines.push(`SET client_min_messages TO WARNING;`)
lines.push(`BEGIN;`)
lines.push(``)
lines.push(`-- Reset memberships, then repopulate from the full handle lists.`)
lines.push(`TRUNCATE collection_products;`)
lines.push(``)

let pairs = 0
for (const p of live) {
  const handles = [...new Set(p.categoryHandles || [])]
  for (const h of handles) {
    // Insert only if a matching collection (category) exists. Position by
    // product id for a stable order; source 'manual' = curated baseline.
    lines.push(
      `INSERT INTO collection_products (collection_id, product_id, position, source) ` +
      `SELECT c.id, pr.id, pr.id, 'manual' FROM categories c, products pr ` +
      `WHERE c.slug = ${sq(h)} AND pr.slug = ${sq(p.slug)} ` +
      `ON CONFLICT (collection_id, product_id) DO NOTHING;`
    )
    pairs++
  }
}

lines.push(``)
lines.push(`COMMIT;`)
lines.push(``)
lines.push(`SELECT`)
lines.push(`  (SELECT COUNT(*) FROM collection_products) AS links,`)
lines.push(`  (SELECT COUNT(DISTINCT collection_id) FROM collection_products) AS collections_with_products,`)
lines.push(`  (SELECT COUNT(*) FROM categories) AS total_collections;`)

const file = path.join(OUT, 'homeu-membership.sql')
fs.writeFileSync(file, lines.join('\n'), { encoding: 'utf8' })
console.log(`✅ ${file}`)
console.log(`   live products: ${live.length}`)
console.log(`   candidate links: ${pairs}`)
console.log(`   size: ${(fs.statSync(file).size / 1024).toFixed(0)} KB`)
