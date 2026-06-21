/**
 * One-off: 2 products (Dione Tables id=10, Bell Glass id=8 locally — match by
 * title since ids may differ between local/prod) have inline <img> tags in
 * their description pointing at cdn.shopify.com URLs that 404 — the source
 * images no longer exist on Shopify at all, so they can't be mirrored.
 * Strip just the dead <img> tags (leaves the rest of the description intact).
 */
import pg from 'pg'

const DEAD_URL_FRAGMENTS = [
  'classicon_135_fscreen_chaos_bct_480x480.jpg',
  'Dione-table-3_480x480.jpg',
  'Dione-coffee-tabel-3_480x480.jpg',
]

const conn = process.env.DATABASE_URI || process.env.DATABASE_URL || 'postgres://homeu:homeu@localhost:5432/homeu'
const pool = new pg.Pool({ connectionString: conn, connectionTimeoutMillis: 8000 })

const run = async () => {
  const rows = await pool.query(`SELECT id, title, description::text AS d FROM products WHERE description::text LIKE '%cdn.shopify%'`)
  let fixed = 0
  for (const r of rows.rows) {
    let html = JSON.parse(r.d)
    let changed = false
    for (const frag of DEAD_URL_FRAGMENTS) {
      const re = new RegExp(`<img[^>]*${frag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^>]*>`, 'g')
      if (re.test(html)) { html = html.replace(re, ''); changed = true }
    }
    if (changed) {
      await pool.query(`UPDATE products SET description = $1::jsonb, updated_at = NOW() WHERE id = $2`, [JSON.stringify(html), r.id])
      console.log(`fixed product #${r.id} (${r.title})`)
      fixed++
    }
  }
  console.log(`done: ${fixed} product(s) fixed`)
  await pool.end()
}
run().catch((e) => { console.error('failed:', e.message); process.exit(1) })
