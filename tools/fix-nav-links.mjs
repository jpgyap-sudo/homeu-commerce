/**
 * fix-nav-links.mjs
 * =================
 * site_settings.nav_main / nav_footer (the runtime nav source, overriding the
 * static navigation.json fallback) had two broken links inherited from the
 * Shopify import:
 *   - "Design Trends" pointed to generic /blog (lost the actual content) —
 *     now moved to its own page at /pages/design-trends.
 *   - "Moodboard" pointed to /blog/moodboards, a slug that doesn't exist —
 *     the real blog handle is interior-design-moodboards.
 * Idempotent: walks the JSON tree and rewrites matching hrefs in place.
 */
import pg from 'pg'

function fixTree(nodes) {
  if (!Array.isArray(nodes)) return nodes
  for (const node of nodes) {
    if (node.title === 'Design Trends' && node.href === '/blog') {
      node.href = '/pages/design-trends'
    }
    if (node.title === 'Moodboard' && node.href === '/blog/moodboards') {
      node.href = '/blog/interior-design-moodboards'
    }
    if (Array.isArray(node.children) && node.children.length) fixTree(node.children)
  }
  return nodes
}

const conn = process.env.DATABASE_URI || process.env.DATABASE_URL || 'postgres://homeu:homeu@localhost:5432/homeu'
const pool = new pg.Pool({ connectionString: conn, connectionTimeoutMillis: 8000 })

const run = async () => {
  for (const key of ['nav_main', 'nav_footer']) {
    const { rows } = await pool.query('SELECT value FROM site_settings WHERE key = $1', [key])
    if (rows.length === 0) { console.log(`${key}: not found, skipped`); continue }
    const fixed = fixTree(rows[0].value)
    await pool.query('UPDATE site_settings SET value = $1::jsonb WHERE key = $2', [JSON.stringify(fixed), key])
    console.log(`${key}: patched`)
  }
  await pool.end()
}
run().catch((e) => { console.error('fix-nav-links failed:', e.message); process.exit(1) })
