/**
 * Build the Media index: scan every image source in the DB, dedupe by content
 * hash (the sha256 in each DO Spaces cdn-mirror URL), record where each image
 * is used, and upsert one `media` row per distinct object.
 *
 * Sources scanned:
 *   product_images        → usage {refType:'product'}
 *   articles.image_url    → usage {refType:'article'}        (featured)
 *   articles.body <img>   → usage {refType:'article-body'}
 *   homepage_sections     → usage {refType:'theme'}          (config image URLs)
 *   header_settings logo  → usage {refType:'brand'}
 *
 * filesize / mime / original filename come from cdn-migration-manifest.json.
 * Idempotent. Run against local, then sync to VPS with --emit-sql.
 *
 *   node index-media.mjs              # index local DB
 *   node index-media.mjs --emit-sql   # also write output/media-index.sql for VPS
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from '../../node_modules/pg/lib/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uri = (fs.readFileSync(path.join(__dirname, '..', '..', 'apps', 'website', '.env'), 'utf8')
  .match(/DATABASE_URI=(.*)/) || [])[1]?.trim()

const IMG_RE = /https?:\/\/[^\s"'<>\\)]+\.(?:jpg|jpeg|png|webp|gif|avif)/gi
const SHA_RE = /cdn-mirror\/([a-f0-9]{64})\.(\w+)/i

// manifest → sha256: { bytes, mime, name }
const manifest = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'output', 'cdn-migration-manifest.json'), 'utf8')) }
  catch { return { urls: {}, hashes: {} } }
})()
const metaBySha = {}
for (const [shopUrl, info] of Object.entries(manifest.urls || {})) {
  if (info.status !== 'done' || !info.sha256) continue
  metaBySha[info.sha256] = {
    bytes: info.bytes || manifest.hashes?.[info.sha256]?.bytes || null,
    mime: info.contentType || null,
    name: path.basename(new URL(shopUrl).pathname),
  }
}

const SOURCE_PRIORITY = { brand: 5, theme: 4, collection: 3, product: 2, article: 1, 'article-body': 1, other: 0 }
const KIND_BY_SOURCE = { brand: 'logo', theme: 'banner', collection: 'image', product: 'product', article: 'article', 'article-body': 'article', other: 'image' }

function shaOf(url) { const m = SHA_RE.exec(url || ''); return m ? { sha: m[1], ext: m[2] } : null }

async function main() {
  const emit = process.argv.includes('--emit-sql')
  const pool = new pg.Pool({ connectionString: uri })

  // sha256 → { url, ext, usage:[], sources:Set }
  const media = new Map()
  const add = (url, usageEntry) => {
    const s = shaOf(url)
    if (!s) return // only index objects already on our CDN
    let m = media.get(s.sha)
    if (!m) { m = { url, ext: s.ext, usage: [], sources: new Set() }; media.set(s.sha, m) }
    m.usage.push(usageEntry)
    m.sources.add(usageEntry.refType === 'article-body' ? 'article' : usageEntry.refType)
  }

  // 1. product images
  const pi = await pool.query(
    `SELECT pi.url, pi.product_id, pi.sort_order, p.title
     FROM product_images pi JOIN products p ON p.id = pi.product_id`)
  pi.rows.forEach(r => add(r.url, { refType: 'product', refId: r.product_id, refTitle: r.title, sortOrder: r.sort_order }))

  // 2. article featured + 3. article body
  const arts = await pool.query(`SELECT id, title, image_url, body FROM articles`)
  for (const a of arts.rows) {
    if (a.image_url) add(a.image_url, { refType: 'article', refId: a.id, refTitle: a.title, featured: true })
    for (const u of new Set((a.body || '').match(IMG_RE) || [])) add(u, { refType: 'article-body', refId: a.id, refTitle: a.title })
  }

  // 4. homepage/footer section config images
  const secs = await pool.query(`SELECT id, type, config::text AS c FROM homepage_sections`)
  for (const s of secs.rows) {
    for (const u of new Set((s.c || '').match(IMG_RE) || [])) add(u, { refType: 'theme', refId: s.id, refTitle: s.type })
  }

  // 5. brand: header logo + site-config logo
  const hs = await pool.query(`SELECT value FROM site_settings WHERE key = 'header_settings'`)
  const logo = hs.rows[0]?.value?.logoUrl
  if (logo) add(logo, { refType: 'brand', refId: 0, refTitle: 'Header logo' })

  // Upsert
  const sql = ['-- Media index (generated)', 'SET client_min_messages TO WARNING;', 'BEGIN;']
  let count = 0
  for (const [sha, m] of media) {
    const source = [...m.sources].sort((a, b) => (SOURCE_PRIORITY[b] || 0) - (SOURCE_PRIORITY[a] || 0))[0] || 'other'
    const kind = KIND_BY_SOURCE[source] || 'image'
    const meta = metaBySha[sha] || {}
    const usageJson = JSON.stringify(m.usage)
    const filename = meta.name || `${sha.slice(0, 12)}.${m.ext}`
    const params = [m.url, filename, meta.mime || `image/${m.ext === 'jpg' ? 'jpeg' : m.ext}`, meta.bytes, sha, source, kind, usageJson, m.usage.length]
    await pool.query(
      `INSERT INTO media (url, filename, mime_type, filesize, sha256, source, kind, usage, used_count, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9, NOW(), NOW())
       ON CONFLICT (sha256) WHERE sha256 IS NOT NULL DO UPDATE SET
         url=EXCLUDED.url, filename=EXCLUDED.filename, mime_type=EXCLUDED.mime_type,
         filesize=COALESCE(EXCLUDED.filesize, media.filesize),
         source=EXCLUDED.source, kind=EXCLUDED.kind, usage=EXCLUDED.usage,
         used_count=EXCLUDED.used_count, updated_at=NOW()`,
      params)
    if (emit) {
      const T = '$MX$'
      sql.push(`INSERT INTO media (url, filename, mime_type, filesize, sha256, source, kind, usage, used_count, created_at, updated_at) VALUES (${T}${m.url}${T}, ${T}${filename}${T}, ${T}${params[2]}${T}, ${meta.bytes || 'NULL'}, ${T}${sha}${T}, ${T}${source}${T}, ${T}${kind}${T}, ${T}${usageJson}${T}::jsonb, ${m.usage.length}, NOW(), NOW()) ON CONFLICT (sha256) WHERE sha256 IS NOT NULL DO UPDATE SET url=EXCLUDED.url, filename=EXCLUDED.filename, mime_type=EXCLUDED.mime_type, filesize=COALESCE(EXCLUDED.filesize, media.filesize), source=EXCLUDED.source, kind=EXCLUDED.kind, usage=EXCLUDED.usage, used_count=EXCLUDED.used_count, updated_at=NOW();`)
    }
    count++
  }

  // Report
  const bySource = {}
  for (const [, m] of media) {
    const src = [...m.sources].sort((a, b) => (SOURCE_PRIORITY[b] || 0) - (SOURCE_PRIORITY[a] || 0))[0] || 'other'
    bySource[src] = (bySource[src] || 0) + 1
  }
  await pool.end()

  console.log(`Indexed ${count} distinct media objects:`)
  Object.entries(bySource).sort((a, b) => b[1] - a[1]).forEach(([s, n]) => console.log(`  ${s}: ${n}`))

  if (emit) {
    sql.push('COMMIT;')
    const out = path.join(__dirname, 'output', 'media-index.sql')
    fs.writeFileSync(out, sql.join('\n'), 'utf8')
    console.log(`VPS sync SQL: ${out}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
