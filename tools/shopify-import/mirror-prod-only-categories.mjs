/**
 * One-off: production's `categories` table has 22 rows that don't exist in
 * the local DB at all (slug mismatch from an earlier collection-content
 * import run directly against prod), each still pointing at a raw
 * cdn.shopify.com URL. Since these rows aren't in the local DB, the regular
 * mirror-db-assets.mjs --scan/--rewrite cycle (which reads from the local DB)
 * never sees them. Mirror each by URL directly (no DB read needed) and emit
 * slug-keyed UPDATE SQL to apply straight to production.
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MANIFEST_PATH = path.join(__dirname, 'output', 'cdn-migration-manifest.json')

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

// slug -> shopify URL, captured from production
const ROWS = {
  'living-room': 'https://cdn.shopify.com/s/files/1/0559/7377/3476/collections/living.jpg?v=1619327188',
  bedroom: 'https://cdn.shopify.com/s/files/1/0559/7377/3476/collections/bedroom.png?v=1619327169',
  'ottoman-pouf': 'https://cdn.shopify.com/s/files/1/0559/7377/3476/collections/tape_4.jpg?v=1627169778',
  'fabric-swatches-velvet': 'https://cdn.shopify.com/s/files/1/0559/7377/3476/collections/pcb1.jpg?v=1623135450',
  'fabric-swatches-linen': 'https://cdn.shopify.com/s/files/1/0559/7377/3476/collections/cartoon1.jpg?v=1623134198',
  'fabric-swatches-leatherette': 'https://cdn.shopify.com/s/files/1/0559/7377/3476/collections/car1.jpg?v=1623141186',
  'tv-stand': 'https://cdn.shopify.com/s/files/1/0559/7377/3476/collections/Capture.jpg?v=1665807083',
  'tv-cabinet': 'https://cdn.shopify.com/s/files/1/0559/7377/3476/collections/z6865436025004_fc70cb6e8ec68f8d034703a040a8cb2d.jpg?v=1754106666',
  lighting: 'https://cdn.shopify.com/s/files/1/0559/7377/3476/collections/damian1.jpg?v=1736387233',
  furniture: 'https://cdn.shopify.com/s/files/1/0559/7377/3476/collections/contemporary.webp?v=1736387163',
  fan: 'https://cdn.shopify.com/s/files/1/0559/7377/3476/collections/53_60ba30f1-8d2d-4afb-9ea6-0bd834959e14.png?v=1736387505',
  'dining-room': 'https://cdn.shopify.com/s/files/1/0559/7377/3476/collections/dining.jpg?v=1627170382',
  'table-lamp': 'https://cdn.shopify.com/s/files/1/0559/7377/3476/collections/1.jpg?v=1627170271',
  'pendant-light': 'https://cdn.shopify.com/s/files/1/0559/7377/3476/collections/769951-1.jpg?v=1627170146',
  'floor-lamp': 'https://cdn.shopify.com/s/files/1/0559/7377/3476/collections/H457617bb6258416393feb2879ab3bd7cY.jpg?v=1627170323',
  'wall-light': 'https://cdn.shopify.com/s/files/1/0559/7377/3476/collections/a4.jpg?v=1627170166',
  'veratti-sinteredstone': 'https://cdn.shopify.com/s/files/1/0559/7377/3476/collections/905cdcba5bc9e66acfb65608b33d0b93.jpg?v=1625492514',
  'surface-mounted-light': 'https://cdn.shopify.com/s/files/1/0559/7377/3476/collections/a5.jpg?v=1627169814',
  'wpc-wall-panel-grille-series': 'https://cdn.shopify.com/s/files/1/0559/7377/3476/collections/1_823290fa-b7e4-4238-bb40-2a1cf1ecb195.jpg?v=1676268328',
  'sintered-stone': 'https://cdn.shopify.com/s/files/1/0559/7377/3476/collections/viola.jpg?v=1698391390',
  'sofa-collection-2025': 'https://cdn.shopify.com/s/files/1/0559/7377/3476/collections/Untitleddesign_4.png?v=1746779644',
  'designer-pillows': 'https://cdn.shopify.com/s/files/1/0559/7377/3476/collections/WL5211-2-WK_JPG.jpg?v=1754300626',
}

const extFromUrl = (url) => { const e = path.extname(new URL(url).pathname).toLowerCase(); return e && e.length <= 5 ? e : '.jpg' }
const loadManifest = () => fs.existsSync(MANIFEST_PATH) ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) : { urls: {}, hashes: {} }
const saveManifest = (m) => fs.writeFileSync(MANIFEST_PATH, JSON.stringify(m, null, 2))

async function main() {
  loadEnv()
  const manifest = loadManifest()
  const s3 = new S3Client({
    endpoint: `https://${process.env.DO_SPACES_REGION}.digitaloceanspaces.com`,
    region: process.env.DO_SPACES_REGION,
    credentials: { accessKeyId: process.env.DO_SPACES_KEY, secretAccessKey: process.env.DO_SPACES_SECRET },
    forcePathStyle: false,
  })
  const bucket = process.env.DO_SPACES_BUCKET
  const sqlLines = ['-- Apply mirrored-CDN rewrites for production-only category rows', 'BEGIN;']

  for (const [slug, url] of Object.entries(ROWS)) {
    let cdnUrl
    if (manifest.urls[url]?.status === 'done') {
      cdnUrl = manifest.urls[url].cdnUrl
      console.log(`${slug}: already mirrored`)
    } else {
      const res = await fetch(url)
      if (!res.ok) { console.error(`${slug}: HTTP ${res.status} — skipped`); continue }
      const buf = Buffer.from(await res.arrayBuffer())
      const sha256 = crypto.createHash('sha256').update(buf).digest('hex')
      const ext = extFromUrl(url)
      const key = `cdn-mirror/${sha256}${ext}`
      const contentType = res.headers.get('content-type') || 'application/octet-stream'
      if (!manifest.hashes[sha256]) {
        await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buf, ContentType: contentType, ACL: 'public-read' }))
        manifest.hashes[sha256] = { key, cdnUrl: `${process.env.DO_SPACES_CDN_ENDPOINT}/${key}`, bytes: buf.length }
      }
      cdnUrl = manifest.hashes[sha256].cdnUrl
      manifest.urls[url] = { status: 'done', sha256, spacesKey: key, cdnUrl, bytes: buf.length, contentType }
      console.log(`${slug}: mirrored -> ${cdnUrl}`)
    }
    const TAG = '$HOMEU_RW_7f3a$'
    sqlLines.push(`UPDATE categories SET image_url = ${TAG}${cdnUrl}${TAG}, updated_at = NOW() WHERE slug = '${slug}';`)
  }
  sqlLines.push('COMMIT;')
  saveManifest(manifest)

  const outPath = path.join(__dirname, 'output', 'prod-only-categories-rewrite.sql')
  fs.writeFileSync(outPath, sqlLines.join('\n'), 'utf8')
  console.log(`\nWrote ${sqlLines.length - 2} UPDATEs -> ${outPath}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
