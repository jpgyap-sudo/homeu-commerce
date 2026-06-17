/**
 * Wire migrated DO Spaces images into DaVinciOS database.
 *
 * 1. Creates product_images table (used by the API/frontend)
 * 2. Populates product_images from products.cdn.json (751 products)
 * 3. Creates media records in the media table (Payload/admin compatibility)
 * 4. Updates categories.image_id for the 39 categories with images
 *
 * Run: node tools/shopify-import/wire-images.mjs [--dry-run]
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT = path.join(__dirname, 'output')
const DRY_RUN = process.argv.includes('--dry-run')

function loadEnv() {
  for (const file of ['../../.env', '../../apps/website/.env'].map(f => path.join(__dirname, f))) {
    if (!fs.existsSync(file)) continue
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
    }
  }
}

loadEnv()
const { Client } = pg
const client = new Client({ connectionString: process.env.DATABASE_URI })
await client.connect()

// ─── 1. Create product_images table ───────────────────────────────────────
console.log('\n── Step 1: Create product_images table')
if (!DRY_RUN) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS product_images (
      id          SERIAL PRIMARY KEY,
      product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      url         TEXT    NOT NULL,
      alt         TEXT    NOT NULL DEFAULT '',
      sort_order  INTEGER NOT NULL DEFAULT 0,
      width       INTEGER,
      height      INTEGER,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await client.query(`CREATE INDEX IF NOT EXISTS product_images_product_id_idx ON product_images(product_id)`)
  console.log('  ✓ product_images table ready')
} else {
  console.log('  [dry-run] would create product_images table')
}

// ─── Load data ─────────────────────────────────────────────────────────────
const products = JSON.parse(fs.readFileSync(path.join(OUTPUT, 'products.cdn.json'), 'utf8'))
const categories = JSON.parse(fs.readFileSync(path.join(OUTPUT, 'categories.cdn.json'), 'utf8'))
const manifest = JSON.parse(fs.readFileSync(path.join(OUTPUT, 'cdn-migration-manifest.json'), 'utf8'))

// Build shopifyUrl → cdnUrl map from manifest (for categories without direct .cdn.json image)
const urlMap = {}
for (const [url, info] of Object.entries(manifest.urls)) {
  if (info.status === 'done') urlMap[url] = info.cdnUrl
}

// Load product slug → DB id map
const dbProducts = await client.query(`SELECT id, slug FROM products`)
const slugToId = {}
dbProducts.rows.forEach(r => { slugToId[r.slug] = r.id })

// ─── 2. Populate product_images ───────────────────────────────────────────
console.log('\n── Step 2: Populate product_images')
const productsWithImages = products.filter(p => p.images?.length > 0)
console.log(`  ${productsWithImages.length} products have images (${products.reduce((n, p) => n + (p.images?.length || 0), 0)} total rows)`)

let imgInserted = 0, imgSkipped = 0
for (const p of productsWithImages) {
  const productId = slugToId[p.slug]
  if (!productId) { imgSkipped++; continue }

  if (!DRY_RUN) {
    // Clear existing rows first (idempotent)
    await client.query(`DELETE FROM product_images WHERE product_id = $1`, [productId])
    for (let i = 0; i < p.images.length; i++) {
      const img = p.images[i]
      await client.query(
        `INSERT INTO product_images (product_id, url, alt, sort_order, width, height) VALUES ($1,$2,$3,$4,$5,$6)`,
        [productId, img.src, img.alt || '', i, img.width || null, img.height || null]
      )
    }
    imgInserted++
  }
}
console.log(`  ${DRY_RUN ? '[dry-run]' : '✓'} ${imgInserted} products wired, ${imgSkipped} skipped (slug not in DB)`)

// ─── 3. Create media records (Payload admin compatibility) ────────────────
console.log('\n── Step 3: Create media records')
const uniqueHashes = Object.entries(manifest.hashes)
console.log(`  ${uniqueHashes.length} unique content hashes to insert as media records`)

let mediaInserted = 0
if (!DRY_RUN) {
  // Clear existing media (idempotent, no other data depends on these yet)
  await client.query(`DELETE FROM media`)
  for (const [sha256, info] of uniqueHashes) {
    const filename = path.basename(info.key)
    await client.query(
      `INSERT INTO media (url, filename, mime_type, filesize, alt, updated_at, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [info.cdnUrl, filename, 'image/jpeg', info.bytes || null, '']
    )
    mediaInserted++
  }
  console.log(`  ✓ ${mediaInserted} media records created`)
} else {
  console.log(`  [dry-run] would insert ${uniqueHashes.length} media records`)
}

// ─── 4. Wire categories.image_id ──────────────────────────────────────────
console.log('\n── Step 4: Wire category images')
const catsWithImage = categories.filter(c => c.image)
console.log(`  ${catsWithImage.length} categories have images`)

let catWired = 0
if (!DRY_RUN) {
  for (const cat of catsWithImage) {
    // Find media record by url
    const mediaRow = await client.query(`SELECT id FROM media WHERE url = $1 LIMIT 1`, [cat.image])
    if (mediaRow.rows.length === 0) continue
    const mediaId = mediaRow.rows[0].id
    await client.query(`UPDATE categories SET image_id = $1 WHERE slug = $2`, [mediaId, cat.slug])
    catWired++
  }
  console.log(`  ✓ ${catWired} categories updated with image_id`)
} else {
  console.log(`  [dry-run] would update ${catsWithImage.length} categories`)
}

// ─── Summary ──────────────────────────────────────────────────────────────
console.log('\n── Summary')
if (!DRY_RUN) {
  const totalRows = await client.query(`SELECT COUNT(*) as n FROM product_images`)
  const mediaRows = await client.query(`SELECT COUNT(*) as n FROM media`)
  const catRows = await client.query(`SELECT COUNT(*) as n FROM categories WHERE image_id IS NOT NULL`)
  console.log(`  product_images rows: ${totalRows.rows[0].n}`)
  console.log(`  media records:       ${mediaRows.rows[0].n}`)
  console.log(`  categories with img: ${catRows.rows[0].n}`)
} else {
  console.log('  (skipped in dry-run)')
}

await client.end()
console.log('\nDone.')
