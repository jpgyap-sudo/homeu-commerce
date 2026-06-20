/**
 * merge-homepage-sections.mjs — one-time no-loss merge of the homepage layout
 * ===========================================================================
 * Local had 13 sections, production had 9 (incl. image_with_text + image_bar that
 * local lacked). This merges BOTH (nothing lost) and writes the identical result
 * to local AND production so they finally match.
 *
 *   node tools/merge-homepage-sections.mjs
 *
 * Safe: production was pg_dump'd first. Touches only homepage_sections.
 */
import pg from 'pg'
import { execSync } from 'child_process'

// Production-only sections to fold in (captured from prod), inserted after collection_grid.
const PROD_UNIQUE = [
  { type: 'image_with_text', enabled: true, config: { text: 'WPC wall panels offer premium aesthetics and durability. Water-resistant, eco-friendly, and available in a wide range of textures — perfect for accent walls, home offices, and commercial spaces.', image: 'https://homeatelierspaces.sgp1.cdn.digitaloceanspaces.com/cdn-mirror/8bc3e313eaa7f8a7aaab50f9b8a019b275cfbddad3506cf2f798adbbfefd9421.jpg', title: 'Mix and match wall panels', buttonLink: '/products?category=wall-panels', buttonText: 'Shop Wall Panels' } },
  { type: 'image_bar', enabled: true, config: { images: [
    { link: '', image: 'https://homeatelierspaces.sgp1.cdn.digitaloceanspaces.com/cdn-mirror/f32e665e609b58bb86f66eaffd2df091084e04ec48e5b6495880908b9c855d42.jpg' },
    { link: '', image: 'https://homeatelierspaces.sgp1.cdn.digitaloceanspaces.com/cdn-mirror/62bea1d623c484fad63aea65206863ac8eeaf6f8e226de4f48973ac27c26c7af.jpg' },
    { link: '', image: 'https://homeatelierspaces.sgp1.cdn.digitaloceanspaces.com/cdn-mirror/2ae243672a45beb6fc81f489111e2eca0f5341921cc3ee2c7be3917082cee3d9.jpg' },
  ] } },
]

const VPS = process.env.HOMEU_VPS_SSH || 'root@100.64.175.88'
const HOME = (process.env.USERPROFILE || process.env.HOME || '').replace(/\\/g, '/')
const SSH = `ssh -i "${HOME}/.ssh/id_superroo_vps" -o StrictHostKeyChecking=no -o ConnectTimeout=15`
const localUri = process.env.DATABASE_URI || 'postgres://homeu:homeu@localhost:5432/homeu'

const local = new pg.Pool({ connectionString: localUri, connectionTimeoutMillis: 8000 })

const run = async () => {
  // 1. Read local's sections (the user's design) in order.
  const { rows } = await local.query('SELECT type, enabled, config FROM homepage_sections ORDER BY position ASC, id ASC')
  if (rows.length === 0) throw new Error('local homepage_sections is empty — aborting')

  // 2. Insert the prod-unique sections right after collection_grid (no loss).
  const merged = []
  for (const r of rows) {
    merged.push({ type: r.type, enabled: r.enabled, config: r.config })
    if (r.type === 'collection_grid') for (const p of PROD_UNIQUE) merged.push(p)
  }
  // If there was no collection_grid, append them at the end so nothing is dropped.
  if (!rows.some((r) => r.type === 'collection_grid')) merged.push(...PROD_UNIQUE)
  // De-dupe by type (keep first) in case prod-unique already present.
  const seen = new Set()
  const final = merged.filter((s) => (seen.has(s.type) ? false : seen.add(s.type)))

  // 3. Build the rows with clean positions ×10.
  const finalRows = final.map((s, i) => ({ type: s.type, position: (i + 1) * 10, enabled: s.enabled, config: s.config }))
  console.log('Merged homepage =', finalRows.map((r) => r.type).join(' → '))

  // 4. Build a portable SQL transaction (dollar-quoted JSON, no escaping needed).
  const values = finalRows.map((r) =>
    `('${r.type}', ${r.position}, ${r.enabled}, $j$${JSON.stringify(r.config)}$j$::jsonb)`).join(',\n  ')
  const sql = `BEGIN;\nTRUNCATE homepage_sections RESTART IDENTITY;\nINSERT INTO homepage_sections (type, position, enabled, config) VALUES\n  ${values};\nCOMMIT;\n`

  // 5. Apply to LOCAL.
  await local.query(sql)
  console.log('✅ LOCAL homepage_sections updated (' + finalRows.length + ' sections)')

  // 6. Apply the SAME to PRODUCTION via the postgres container.
  execSync(`${SSH} ${VPS} "docker exec -i homeu-commerce-postgres-1 psql -U homeu -d homeu -v ON_ERROR_STOP=1"`, { input: sql, stdio: ['pipe', 'inherit', 'inherit'] })
  console.log('✅ PRODUCTION homepage_sections updated — local and prod now match.')

  await local.end()
}
run().catch((e) => { console.error('merge failed:', e.message); process.exit(1) })
