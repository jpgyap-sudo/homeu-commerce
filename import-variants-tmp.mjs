import { Pool } from 'pg'
import { readFileSync } from 'fs'

const connectionString = process.env.DATABASE_URI
if (!connectionString) throw new Error('DATABASE_URI required')
const pool = new Pool({ connectionString })

const candidates = JSON.parse(readFileSync('C:/tmp/shopify_variants/candidates.json', 'utf8'))

async function main() {
  let imported = 0
  let skipped = 0
  for (const c of candidates) {
    const prodRes = await pool.query('SELECT id FROM products WHERE shopify_id = $1', [c.shopify_id])
    if (prodRes.rowCount === 0) { skipped++; continue }
    const productId = prodRes.rows[0].id

    const existing = await pool.query('SELECT COUNT(*) FROM product_variants WHERE product_id = $1', [productId])
    if (parseInt(existing.rows[0].count, 10) > 0) { skipped++; continue }

    const prices = c.variants.map(v => v.price)
    const minPrice = Math.min(...prices)

    for (let i = 0; i < c.variants.length; i++) {
      const v = c.variants[i]
      await pool.query(
        `INSERT INTO product_variants (product_id, title, sku, price, inventory_quantity, sort_order, is_default)
         VALUES ($1, $2, $3, $4, 0, $5, $6)`,
        [productId, v.title, v.sku || null, v.price, i, v.price === minPrice && i === c.variants.findIndex(x => x.price === minPrice)]
      )
    }
    // Set products.price to the lowest variant price (the "from" price shown on cards).
    // If the product had an existing sale_price that's now >= the new price (would
    // recreate the price/sale_price inversion bug we just fixed), clear it instead
    // of trusting a discount computed against the old single price.
    const cur = await pool.query('SELECT sale_price FROM products WHERE id = $1', [productId])
    const curSale = cur.rows[0]?.sale_price ? parseFloat(cur.rows[0].sale_price) : null
    if (curSale !== null && curSale >= minPrice) {
      await pool.query('UPDATE products SET price = $1, sale_price = NULL WHERE id = $2', [minPrice, productId])
    } else {
      await pool.query('UPDATE products SET price = $1 WHERE id = $2', [minPrice, productId])
    }
    imported++
  }
  console.log(`Imported variants for ${imported} products. Skipped ${skipped} (no match or already has variants).`)
  await pool.end()
}

main().catch(e => { console.error(e); process.exit(1) })
