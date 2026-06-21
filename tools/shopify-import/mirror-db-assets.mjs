/**
 * Mirror the *remaining* Shopify-hosted assets referenced inside the DATABASE
 * (not the export JSON) into DigitalOcean Spaces, then rewrite the DB columns
 * + site-config.json to the Spaces CDN URLs.
 *
 * Two Shopify CDN URL shapes exist in this dataset — both proxy the exact
 * same asset storage, just via different hostnames:
 *   - https://cdn.shopify.com/...                (the generic CDN host)
 *   - https://homeu.ph/cdn/shop/... (or www.)     (Shopify's "serve through
 *     the merchant's own domain" proxy — easy to miss with a cdn.shopify.com-
 *     only regex, which is exactly how categories.image_url + articles.body
 *     were missed in the first migration pass.)
 *
 * Sources scanned:
 *   - articles.image_url            (plain column)
 *   - articles.body                 (inline <img src> inside HTML)
 *   - products.description          (inline <img src> inside HTML/JSONB)
 *   - categories.image_url          (plain column)
 *   - categories.description        (inline <img src>, if any)
 *   - homepage_sections.config      (image URLs inside JSONB)
 *   - apps/website/src/data/site-config.json  (logo.shopifyUrl)
 *
 * Read-only against Shopify (public HTTPS GET). Writes only to DO Spaces, the
 * local Postgres, the shared cdn-migration-manifest.json, and site-config.json.
 *
 * Usage:
 *   node mirror-db-assets.mjs --scan            collect URLs, show counts
 *   node mirror-db-assets.mjs --mirror --execute  download+upload missing
 *   node mirror-db-assets.mjs --rewrite --execute rewrite DB + site-config
 *   node mirror-db-assets.mjs --verify          count remaining shopify refs
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import pg from '../../node_modules/pg/lib/index.js'

const { Pool } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = path.join(__dirname, 'output')
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'cdn-migration-manifest.json')
const SITE_CONFIG_PATH = path.join(__dirname, '..', '..', 'apps', 'website', 'src', 'data', 'site-config.json')
const SHOPIFY_CDN_REGEX = /https:\/\/(cdn\.shopify\.com|(?:www\.)?homeu\.ph\/cdn\/shop)\/[^\s"'<>\\)]+/g

function loadEnv() {
  for (const file of [
    path.join(__dirname, '..', '..', 'apps', 'website', '.env'),
    path.join(__dirname, '..', '..', '.env'),
  ]) {
    if (!fs.existsSync(file)) continue
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
    }
  }
}

const loadManifest = () => fs.existsSync(MANIFEST_PATH) ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) : { urls: {}, hashes: {} }
const saveManifest = (m) => fs.writeFileSync(MANIFEST_PATH, JSON.stringify(m, null, 2))
const extFromUrl = (url) => { const e = path.extname(new URL(url).pathname).toLowerCase(); return e && e.length <= 5 ? e : '.jpg' }

function newPool() {
  const cs = process.env.DATABASE_URI || process.env.DATABASE_URL
  return new Pool({ connectionString: cs })
}

// ── Collect all distinct Shopify URLs referenced in the DB + site-config ──
const SHOPIFY_LIKE = `(image_url LIKE '%cdn.shopify%' OR image_url LIKE '%/cdn/shop/%')`
const SHOPIFY_LIKE_TEXT = (col) => `(${col} LIKE '%cdn.shopify%' OR ${col} LIKE '%/cdn/shop/%')`

async function collectUrls(pool) {
  const urls = new Set()
  const add = (text) => { for (const u of (text || '').match(SHOPIFY_CDN_REGEX) || []) urls.add(u) }

  const a = await pool.query(`SELECT image_url FROM articles WHERE ${SHOPIFY_LIKE}`)
  a.rows.forEach(r => add(r.image_url))

  const ab = await pool.query(`SELECT body FROM articles WHERE ${SHOPIFY_LIKE_TEXT('body')}`)
  ab.rows.forEach(r => add(r.body))

  const p = await pool.query(`SELECT description::text AS d FROM products WHERE ${SHOPIFY_LIKE_TEXT('description::text')}`)
  p.rows.forEach(r => add(r.d))

  const cat = await pool.query(`SELECT image_url FROM categories WHERE ${SHOPIFY_LIKE}`)
  cat.rows.forEach(r => add(r.image_url))

  const catd = await pool.query(`SELECT description FROM categories WHERE ${SHOPIFY_LIKE_TEXT('description')}`)
  catd.rows.forEach(r => add(r.description))

  const pg2 = await pool.query(`SELECT content::text AS c FROM pages WHERE ${SHOPIFY_LIKE_TEXT('content::text')}`)
  pg2.rows.forEach(r => add(r.c))

  const h = await pool.query(`SELECT config::text AS c FROM homepage_sections WHERE ${SHOPIFY_LIKE_TEXT('config::text')}`)
  h.rows.forEach(r => add(r.c))

  if (fs.existsSync(SITE_CONFIG_PATH)) add(fs.readFileSync(SITE_CONFIG_PATH, 'utf8'))

  return [...urls]
}

async function scanCmd() {
  const pool = newPool()
  const urls = await collectUrls(pool)
  const manifest = loadManifest()
  let added = 0
  for (const u of urls) if (!manifest.urls[u]) { manifest.urls[u] = { status: 'pending' }; added++ }
  saveManifest(manifest)
  const done = urls.filter(u => manifest.urls[u]?.status === 'done').length
  console.log(`Distinct Shopify URLs in DB/site-config: ${urls.length}`)
  console.log(`  already mirrored (done): ${done}`)
  console.log(`  newly added to manifest: ${added}`)
  console.log(`  pending mirror:          ${urls.filter(u => manifest.urls[u]?.status !== 'done').length}`)
  await pool.end()
}

async function mirrorCmd(execute) {
  const pool = newPool()
  const urls = await collectUrls(pool)
  await pool.end()
  const manifest = loadManifest()
  for (const u of urls) if (!manifest.urls[u]) manifest.urls[u] = { status: 'pending' }
  const pending = urls.filter(u => manifest.urls[u].status !== 'done')

  if (!execute) {
    console.log(`[dry run] would mirror ${pending.length} URL(s). First 10:`)
    pending.slice(0, 10).forEach(u => console.log('  ' + u))
    return
  }
  if (pending.length === 0) { console.log('Nothing to mirror — all done.'); return }

  const s3 = new S3Client({
    endpoint: `https://${process.env.DO_SPACES_REGION}.digitaloceanspaces.com`,
    region: process.env.DO_SPACES_REGION,
    credentials: { accessKeyId: process.env.DO_SPACES_KEY, secretAccessKey: process.env.DO_SPACES_SECRET },
    forcePathStyle: false,
  })
  const bucket = process.env.DO_SPACES_BUCKET
  let ok = 0, err = 0

  for (const url of pending) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      const sha256 = crypto.createHash('sha256').update(buf).digest('hex')
      const ext = extFromUrl(url)
      const key = `cdn-mirror/${sha256}${ext}`
      const contentType = res.headers.get('content-type') || 'application/octet-stream'
      if (!manifest.hashes[sha256]) {
        await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buf, ContentType: contentType, ACL: 'public-read' }))
        manifest.hashes[sha256] = { key, cdnUrl: `${process.env.DO_SPACES_CDN_ENDPOINT}/${key}`, bytes: buf.length }
      }
      manifest.urls[url] = { status: 'done', sha256, spacesKey: key, cdnUrl: manifest.hashes[sha256].cdnUrl, bytes: buf.length, contentType }
      ok++
      if ((ok + err) % 20 === 0) { saveManifest(manifest); console.log(`  …${ok + err}/${pending.length}`) }
    } catch (e) {
      manifest.urls[url] = { status: 'error', error: String(e.message || e) }
      err++
    }
  }
  saveManifest(manifest)
  console.log(`mirrored ${ok} ok, ${err} error(s)`)
}

function mapFor(manifest) {
  const map = new Map()
  for (const [u, info] of Object.entries(manifest.urls)) {
    if (info.status === 'done' && info.cdnUrl) map.set(u, info.cdnUrl)
  }
  return map
}

async function rewriteCmd(execute) {
  const manifest = loadManifest()
  const map = mapFor(manifest)
  const pool = newPool()

  // Generic helper: rewrite every matched URL inside a text column for all
  // rows matching the LIKE filter; returns { rowsChanged, urlsChanged }.
  async function rewriteTextColumn(table, col, idCol = 'id', isJsonb = false) {
    const rows = await pool.query(`SELECT ${idCol} AS id, ${col}::text AS v FROM ${table} WHERE ${SHOPIFY_LIKE_TEXT(`${col}::text`)}`)
    let rowsChanged = 0, urlsChanged = 0
    for (const r of rows.rows) {
      let text = r.v
      let changed = false
      for (const u of new Set(text.match(SHOPIFY_CDN_REGEX) || [])) {
        const to = map.get(u)
        if (to) { text = text.split(u).join(to); changed = true; urlsChanged++ }
      }
      if (changed) {
        rowsChanged++
        if (execute) {
          const cast = isJsonb ? '::jsonb' : ''
          await pool.query(`UPDATE ${table} SET ${col} = $1${cast}, updated_at = NOW() WHERE ${idCol} = $2`, [text, r.id])
        }
      }
    }
    return { rowsChanged, urlsChanged }
  }

  // 1. articles.image_url (plain column, not HTML — direct replace)
  const arts = await pool.query(`SELECT id, image_url FROM articles WHERE ${SHOPIFY_LIKE}`)
  let aCount = 0
  for (const r of arts.rows) {
    const to = map.get(r.image_url)
    if (!to) continue
    if (execute) await pool.query(`UPDATE articles SET image_url = $1, updated_at = NOW() WHERE id = $2`, [to, r.id])
    aCount++
  }

  // 1b. articles.body (inline <img> inside the article HTML)
  const { rowsChanged: abCount, urlsChanged: abUrls } = await rewriteTextColumn('articles', 'body')

  // 2. products.description (replace every shopify url inside the HTML/JSONB)
  const { rowsChanged: pCount, urlsChanged: pUrls } = await rewriteTextColumn('products', 'description', 'id', true)

  // 3. categories.image_url (plain column, not HTML — direct replace)
  const cats = await pool.query(`SELECT id, image_url FROM categories WHERE ${SHOPIFY_LIKE}`)
  let catCount = 0
  for (const r of cats.rows) {
    const to = map.get(r.image_url)
    if (!to) continue
    if (execute) await pool.query(`UPDATE categories SET image_url = $1, updated_at = NOW() WHERE id = $2`, [to, r.id])
    catCount++
  }

  // 3b. categories.description (inline <img>, if any)
  const { rowsChanged: catdCount, urlsChanged: catdUrls } = await rewriteTextColumn('categories', 'description')

  // 4. pages.content (inline <img> inside the page HTML/JSONB)
  const { rowsChanged: pgCount, urlsChanged: pgUrls } = await rewriteTextColumn('pages', 'content', 'id', true)

  // 5. homepage_sections.config
  const { rowsChanged: sCount } = await rewriteTextColumn('homepage_sections', 'config', 'id', true)
  await pool.end()

  // 4. site-config.json logo
  let logoChanged = false
  if (fs.existsSync(SITE_CONFIG_PATH)) {
    let text = fs.readFileSync(SITE_CONFIG_PATH, 'utf8')
    for (const u of new Set(text.match(SHOPIFY_CDN_REGEX) || [])) {
      const to = map.get(u)
      if (to) { text = text.split(u).join(to); logoChanged = true }
    }
    if (logoChanged && execute) fs.writeFileSync(SITE_CONFIG_PATH, text)
  }

  console.log(`${execute ? 'Rewrote' : '[dry run] would rewrite'}:`)
  console.log(`  articles.image_url:        ${aCount} rows`)
  console.log(`  articles.body:             ${abCount} rows (${abUrls} urls)`)
  console.log(`  products.description:      ${pCount} rows (${pUrls} urls)`)
  console.log(`  categories.image_url:      ${catCount} rows`)
  console.log(`  categories.description:    ${catdCount} rows (${catdUrls} urls)`)
  console.log(`  pages.content:             ${pgCount} rows (${pgUrls} urls)`)
  console.log(`  homepage_sections.config:  ${sCount} rows`)
  console.log(`  site-config.json logo:     ${logoChanged ? 'yes' : 'no'}`)
}

// Emit idempotent UPDATE SQL for rows now pointing at the Spaces CDN, so the
// same rewrite can be applied to another DB (VPS) without FK/restore issues.
async function emitSqlCmd() {
  const pool = newPool()
  const cdn = process.env.DO_SPACES_CDN_ENDPOINT
  const TAG = '$HOMEU_RW_7f3a$'
  const out = []
  out.push('-- Apply mirrored-CDN rewrites (generated from local DB)')
  out.push('SET client_min_messages TO WARNING;')
  out.push('BEGIN;')

  const arts = await pool.query(`SELECT id, image_url FROM articles WHERE image_url LIKE '%digitaloceanspaces%'`)
  for (const r of arts.rows) out.push(`UPDATE articles SET image_url = ${TAG}${r.image_url}${TAG} WHERE id = ${r.id};`)

  const abs = await pool.query(`SELECT id, body FROM articles WHERE body LIKE '%digitaloceanspaces%'`)
  for (const r of abs.rows) out.push(`UPDATE articles SET body = ${TAG}${r.body}${TAG} WHERE id = ${r.id};`)

  const secs = await pool.query(`SELECT id, config::text AS c FROM homepage_sections WHERE config::text LIKE '%digitaloceanspaces%'`)
  for (const r of secs.rows) out.push(`UPDATE homepage_sections SET config = ${TAG}${r.c}${TAG}::jsonb WHERE id = ${r.id};`)

  const prods = await pool.query(`SELECT id, description::text AS d FROM products WHERE description::text LIKE '%digitaloceanspaces%'`)
  for (const r of prods.rows) out.push(`UPDATE products SET description = ${TAG}${r.d}${TAG}::jsonb WHERE id = ${r.id};`)

  const cats = await pool.query(`SELECT id, image_url FROM categories WHERE image_url LIKE '%digitaloceanspaces%'`)
  for (const r of cats.rows) out.push(`UPDATE categories SET image_url = ${TAG}${r.image_url}${TAG} WHERE id = ${r.id};`)

  const catds = await pool.query(`SELECT id, description FROM categories WHERE description LIKE '%digitaloceanspaces%'`)
  for (const r of catds.rows) out.push(`UPDATE categories SET description = ${TAG}${r.description}${TAG} WHERE id = ${r.id};`)

  const pgs = await pool.query(`SELECT id, content::text AS c FROM pages WHERE content::text LIKE '%digitaloceanspaces%'`)
  for (const r of pgs.rows) out.push(`UPDATE pages SET content = ${TAG}${r.c}${TAG}::jsonb WHERE id = ${r.id};`)

  out.push('COMMIT;')
  await pool.end()
  const fp = path.join(OUTPUT_DIR, 'homeu-asset-rewrite.sql')
  fs.writeFileSync(fp, out.join('\n'), 'utf8')
  console.log(`Wrote ${out.length - 4} UPDATEs -> ${fp}`)
}

// Mirror a single arbitrary URL (e.g. the logo) and print its Spaces CDN URL.
async function mirrorOneCmd(url) {
  const manifest = loadManifest()
  if (manifest.urls[url]?.status === 'done') {
    console.log(manifest.urls[url].cdnUrl)
    return
  }
  const s3 = new S3Client({
    endpoint: `https://${process.env.DO_SPACES_REGION}.digitaloceanspaces.com`,
    region: process.env.DO_SPACES_REGION,
    credentials: { accessKeyId: process.env.DO_SPACES_KEY, secretAccessKey: process.env.DO_SPACES_SECRET },
    forcePathStyle: false,
  })
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex')
  const ext = extFromUrl(url)
  const key = `cdn-mirror/${sha256}${ext}`
  const contentType = res.headers.get('content-type') || 'application/octet-stream'
  if (!manifest.hashes[sha256]) {
    await s3.send(new PutObjectCommand({ Bucket: process.env.DO_SPACES_BUCKET, Key: key, Body: buf, ContentType: contentType, ACL: 'public-read' }))
    manifest.hashes[sha256] = { key, cdnUrl: `${process.env.DO_SPACES_CDN_ENDPOINT}/${key}`, bytes: buf.length }
  }
  manifest.urls[url] = { status: 'done', sha256, spacesKey: key, cdnUrl: manifest.hashes[sha256].cdnUrl, bytes: buf.length, contentType }
  saveManifest(manifest)
  console.log(manifest.hashes[sha256].cdnUrl)
}

async function verifyCmd() {
  const pool = newPool()
  const q = async (label, sql) => { const r = await pool.query(sql); return `${label}: ${r.rows[0].n}` }
  console.log(await q('articles.image_url', `SELECT COUNT(*) n FROM articles WHERE ${SHOPIFY_LIKE}`))
  console.log(await q('articles.body', `SELECT COUNT(*) n FROM articles WHERE ${SHOPIFY_LIKE_TEXT('body')}`))
  console.log(await q('products.description', `SELECT COUNT(*) n FROM products WHERE ${SHOPIFY_LIKE_TEXT('description::text')}`))
  console.log(await q('categories.image_url', `SELECT COUNT(*) n FROM categories WHERE ${SHOPIFY_LIKE}`))
  console.log(await q('categories.description', `SELECT COUNT(*) n FROM categories WHERE ${SHOPIFY_LIKE_TEXT('description')}`))
  console.log(await q('pages.content', `SELECT COUNT(*) n FROM pages WHERE ${SHOPIFY_LIKE_TEXT('content::text')}`))
  console.log(await q('homepage_sections.config', `SELECT COUNT(*) n FROM homepage_sections WHERE ${SHOPIFY_LIKE_TEXT('config::text')}`))
  const sc = fs.existsSync(SITE_CONFIG_PATH) ? (fs.readFileSync(SITE_CONFIG_PATH, 'utf8').match(SHOPIFY_CDN_REGEX) || []).length : 0
  console.log(`site-config.json: ${sc}`)
  await pool.end()
}

async function main() {
  loadEnv()
  const args = process.argv.slice(2)
  const execute = args.includes('--execute')
  if (args.includes('--scan')) await scanCmd()
  else if (args.includes('--mirror')) await mirrorCmd(execute)
  else if (args.includes('--rewrite')) await rewriteCmd(execute)
  else if (args.includes('--emit-sql')) await emitSqlCmd()
  else if (args.find(a => a.startsWith('--url='))) await mirrorOneCmd(args.find(a => a.startsWith('--url=')).slice(6))
  else if (args.includes('--verify')) await verifyCmd()
  else console.log('Usage: --scan | --mirror [--execute] | --rewrite [--execute] | --verify')
}

main().catch(e => { console.error(e); process.exit(1) })
