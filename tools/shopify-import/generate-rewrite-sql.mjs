#!/usr/bin/env node
/**
 * generate-rewrite-sql.mjs
 *
 * Reads cdn-migration-manifest.json and generates SQL UPDATE statements
 * to rewrite product_images.url from Shopify CDN → DO Spaces CDN.
 *
 * Only rewrites URLs that have status=done in the manifest.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, 'output')

const manifest = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'cdn-migration-manifest.json'), 'utf-8'))
const urls = manifest.urls || manifest

const lines = []
lines.push(`-- Rewrite product_images URLs: Shopify CDN → DO Spaces CDN`)
lines.push(`-- Generated ${new Date().toISOString()}`)
lines.push(`SET client_min_messages TO WARNING;`)
lines.push(`BEGIN;`)
lines.push(``)

let count = 0
for (const [shopifyUrl, entry] of Object.entries(urls)) {
  if (entry.status !== 'done' || !entry.cdnUrl) continue
  const from = shopifyUrl.replace(/'/g, "''")
  const to = entry.cdnUrl.replace(/'/g, "''")
  lines.push(`UPDATE product_images SET url = '${to}' WHERE url = '${from}';`)
  count++
}

lines.push(``)
lines.push(`COMMIT;`)
lines.push(``)
lines.push(`-- Verification`)
lines.push(`SELECT`)
lines.push(`  COUNT(*) FILTER (WHERE url LIKE '%digitaloceanspaces.com%') AS do_spaces_urls,`)
lines.push(`  COUNT(*) FILTER (WHERE url LIKE '%cdn.shopify.com%') AS shopify_urls_remaining,`)
lines.push(`  COUNT(*) AS total`)
lines.push(`FROM product_images;`)

const OUTPUT = path.join(OUT_DIR, 'homeu-rewrite-urls.sql')
fs.writeFileSync(OUTPUT, lines.join('\n'), { encoding: 'utf8' })

console.log(`✅ Generated rewrite SQL → ${OUTPUT}`)
console.log(`   URL rewrites: ${count}`)
console.log(`   File size   : ${(fs.statSync(OUTPUT).size / 1024).toFixed(0)} KB`)
