/**
 * Restore YouTube video embeds into product description Lexical JSON.
 *
 * During the HTML→Lexical conversion on import, <iframe> tags were stripped.
 * This script re-extracts YouTube video IDs from the original scraped HTML
 * descriptions (products.json) and appends YouTube nodes to the end of each
 * affected product's description in the DB.
 *
 * YouTube node format used: { type: "youtube", version: 1, videoId: "..." }
 * The renderLexical.ts frontend renderer handles this node type.
 *
 * Run: node tools/shopify-import/restore-youtube.mjs [--dry-run]
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
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

// Load original (pre-CDN) products.json for original HTML descriptions with iframes
const products = JSON.parse(fs.readFileSync(path.join(OUTPUT, 'DaVinciOS-products.json'), 'utf8'))

// Extract YouTube video IDs from original HTML descriptions
const slugToYtIds = {}
for (const p of products) {
  if (!p.description) continue
  const matches = [...p.description.matchAll(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/g)]
  if (matches.length) {
    slugToYtIds[p.slug] = [...new Set(matches.map(m => m[1]))]
  }
}
console.log(`Found ${Object.keys(slugToYtIds).length} products with YouTube embeds (${new Set(Object.values(slugToYtIds).flat()).size} unique video IDs)`)

// Load DB product id+slug+description for affected products
const slugList = Object.keys(slugToYtIds)
const dbRows = await client.query(
  `SELECT id, slug, description FROM products WHERE slug = ANY($1)`,
  [slugList]
)
console.log(`Matched ${dbRows.rows.length} of ${slugList.length} products in DB`)

let updated = 0, skipped = 0
for (const row of dbRows.rows) {
  const videoIds = slugToYtIds[row.slug]
  if (!videoIds?.length) continue

  const lexical = typeof row.description === 'string'
    ? JSON.parse(row.description)
    : row.description

  if (!lexical?.root?.children) { skipped++; continue }

  // Remove any previously-injected youtube nodes (idempotent)
  lexical.root.children = lexical.root.children.filter(n => n.type !== 'youtube')

  // Append youtube nodes
  for (const videoId of videoIds) {
    lexical.root.children.push({
      type: 'youtube',
      version: 1,
      videoId,
    })
  }

  if (!DRY_RUN) {
    await client.query(
      `UPDATE products SET description = $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(lexical), row.id]
    )
  }
  updated++
}

console.log(`${DRY_RUN ? '[dry-run]' : '✓'} Updated ${updated} products, skipped ${skipped}`)
await client.end()
console.log('Done.')
