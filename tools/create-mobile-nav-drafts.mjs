/**
 * One-off: materialize the two mobile-nav options as real draft rows in
 * store_themes (device_scope='mobile'), duplicated from the current
 * mobile_live theme, with snapshot.settings.mobile_nav_style set so they
 * show up under Admin -> Online Store -> "Live mobile theme" as Mobile
 * draft rows ready to preview/edit/publish.
 */
import pg from 'pg'

const conn = process.env.DATABASE_URI || process.env.DATABASE_URL || 'postgres://homeu:homeu_local_password@localhost:5432/homeu'
const pool = new pg.Pool({ connectionString: conn, connectionTimeoutMillis: 8000 })

const DRAFTS = [
  { name: 'Option A — Debut drawer only', navStyle: 'debut', notes: 'Mobile-nav draft: 1:1 clone of homeu.ph Shopify Debut mobile nav (hamburger -> drawer, no bottom bar).' },
  { name: 'Option B — Bottom tabs', navStyle: 'tabs', notes: 'Mobile-nav draft: current custom 5-tab bottom bar over the Debut-style drawer.' },
]

const run = async () => {
  const live = await pool.query(`SELECT id, name, version, snapshot, performance_metrics FROM store_themes WHERE role = 'mobile_live' LIMIT 1`)
  if (live.rows.length === 0) {
    console.error('No mobile_live theme found — open Admin > Online Store once to bootstrap it, then re-run.')
    await pool.end()
    process.exit(1)
  }
  const source = live.rows[0]

  for (const draft of DRAFTS) {
    const snapshot = {
      ...source.snapshot,
      capturedAt: new Date().toISOString(),
      settings: { ...(source.snapshot.settings || {}), mobile_nav_style: draft.navStyle },
    }
    const res = await pool.query(
      `INSERT INTO store_themes (name, role, device_scope, version, source_theme_id, snapshot, performance_metrics, notes, duplicated_at)
       VALUES ($1, 'unpublished', 'mobile', $2, $3, $4::jsonb, $5::jsonb, $6, NOW())
       RETURNING id, name`,
      [draft.name, source.version || '1.0.0', source.id, JSON.stringify(snapshot), JSON.stringify(source.performance_metrics || {}), draft.notes]
    )
    console.log(`Created draft #${res.rows[0].id}: ${res.rows[0].name}`)
  }
  await pool.end()
}

run().catch(err => { console.error(err); process.exit(1) })
