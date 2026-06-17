#!/usr/bin/env node

/**
 * Transform tools/shopify-import/output/raw/pages.json into
 * DaVinciOS CMS compatible format (output/DaVinciOS-pages.json),
 * matching apps/website/src/collections/Pages.ts.
 *
 * Usage: node tools/shopify-import/transform-pages.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const INPUT_FILE = path.join(__dirname, 'output', 'raw', 'pages.json')
const OUTPUT_FILE = path.join(__dirname, 'output', 'DaVinciOS-pages.json')
const STORE_DOMAIN = 'homeu.ph'

function main() {
  const { pages } = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'))

  const DaVinciOSPages = pages.map(p => ({
    title: p.title,
    slug: p.handle,
    content: p.body || '',
    seoTitle: p.title,
    seoDescription: (p.bodySummary || '').substring(0, 160),
    shopifyOriginalUrl: `https://${STORE_DOMAIN}/pages/${p.handle}`,
    isPublished: p.isPublished,
  }))

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(DaVinciOSPages, null, 2))
  console.log(`✅ Transformed ${DaVinciOSPages.length} pages`)
  console.log(`   Wrote: ${OUTPUT_FILE}`)
}

main()
