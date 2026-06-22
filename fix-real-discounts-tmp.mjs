import { Pool } from 'pg'
import { readFileSync } from 'fs'

const connectionString = process.env.DATABASE_URI
if (!connectionString) throw new Error('DATABASE_URI required')
const pool = new Pool({ connectionString })

const shopifyData = new Map()
for (let i = 1; i <= 6; i++) {
  const n = String(i).padStart(2, '0')
  const raw = JSON.parse(readFileSync(`C:/tmp/compareat_batch_${n}.json`, 'utf8'))
  for (const node of raw.data.nodes) {
    if (!node) continue
    const shopifyId = node.id.split('/').pop()
    const v = node.variants.edges[0]?.node
    if (!v) continue
    shopifyData.set(shopifyId, { price: parseFloat(v.price), compareAtPrice: v.compareAtPrice ? parseFloat(v.compareAtPrice) : null })
  }
}

async function main() {
  const { rows: products } = await pool.query(
    `SELECT id, title, shopify_id FROM products WHERE sale_price > 0 AND price > 100 AND shopify_id IS NOT NULL`
  )

  let realDiscount = 0
  let noRealDiscount = 0
  let noShopifyData = 0

  for (const p of products) {
    const real = shopifyData.get(p.shopify_id)
    if (!real) { noShopifyData++; console.log('NO SHOPIFY DATA:', p.id, p.title, p.shopify_id); continue }

    if (real.compareAtPrice && real.compareAtPrice > real.price) {
      // Genuine discount: original = compareAtPrice, current = price
      await pool.query('UPDATE products SET price = $1, sale_price = $2 WHERE id = $3', [real.compareAtPrice, real.price, p.id])
      realDiscount++
    } else {
      // No genuine discount in Shopify's data — clear the fabricated/stale pairing
      await pool.query('UPDATE products SET price = $1, sale_price = NULL WHERE id = $2', [real.price, p.id])
      noRealDiscount++
    }
  }

  console.log(`\nDone. Real discounts kept: ${realDiscount}. Fake discounts cleared: ${noRealDiscount}. No Shopify match: ${noShopifyData}.`)
  await pool.end()
}

main().catch(e => { console.error(e); process.exit(1) })
