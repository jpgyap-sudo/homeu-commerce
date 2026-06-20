import pg from 'pg'
const conn = process.env.DATABASE_URI || process.env.DATABASE_URL || 'postgres://homeu:homeu@localhost:5432/homeu'
const pool = new pg.Pool({ connectionString: conn, connectionTimeoutMillis: 8000 })
const body = '<p><img alt="" src="https://cdn.shopify.com/s/files/1/0559/7377/3476/files/Design_club_2048x2048.jpg?v=1623840328" style="max-width:100%"></p><p><img alt="" src="https://cdn.shopify.com/s/files/1/0559/7377/3476/files/designer_2048x2048.png?v=1623840616" style="max-width:100%"></p>'
const run = async () => {
  const r = await pool.query(
    `INSERT INTO pages (title, slug, content, seo_title, updated_at, created_at)
     VALUES ('Designer Club', 'designerclub', $1::jsonb, 'Designer Club | Home Atelier', NOW(), NOW())
     ON CONFLICT (slug) DO NOTHING`,
    [JSON.stringify(body)]
  )
  console.log('designerclub inserted:', r.rowCount)
  await pool.end()
}
run().catch((e) => { console.error('failed:', e.message); process.exit(1) })
