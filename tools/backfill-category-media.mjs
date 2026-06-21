/**
 * backfill-category-media.mjs
 * ============================
 * The Theme Editor's media library (`media` table) never had category/
 * collection banner images registered — only products/articles/theme/brand —
 * so they never showed up in the MediaPicker's "Browse" tab even though
 * they're real, already-uploaded DO Spaces assets. Idempotent (skips URLs
 * already present).
 */
import pg from 'pg'

const conn = process.env.DATABASE_URI || process.env.DATABASE_URL || 'postgres://homeu:homeu@localhost:5432/homeu'
const pool = new pg.Pool({ connectionString: conn, connectionTimeoutMillis: 8000 })

const run = async () => {
  const cats = await pool.query(`SELECT title, image_url FROM categories WHERE image_url IS NOT NULL AND image_url != ''`)
  let inserted = 0, skipped = 0
  for (const c of cats.rows) {
    const existing = await pool.query('SELECT id FROM media WHERE url = $1', [c.image_url])
    if (existing.rows.length > 0) { skipped++; continue }
    await pool.query(
      `INSERT INTO media (url, filename, source, kind, updated_at, created_at)
       VALUES ($1, $2, 'category', 'image', NOW(), NOW())`,
      [c.image_url, c.title]
    )
    inserted++
  }
  console.log(`category media: inserted ${inserted}, skipped ${skipped} (already registered)`)
  await pool.end()
}
run().catch((e) => { console.error('failed:', e.message); process.exit(1) })
