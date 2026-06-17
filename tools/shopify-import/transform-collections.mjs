#!/usr/bin/env node

/**
 * Transform tools/shopify-import/output/raw/collections.json into
 * DaVinciOS CMS compatible format (output/DaVinciOS-categories.json),
 * matching apps/website/src/collections/Categories.ts.
 *
 * Usage: node tools/shopify-import/transform-collections.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const INPUT_FILE = path.join(__dirname, 'output', 'raw', 'collections.json')
const OUTPUT_FILE = path.join(__dirname, 'output', 'DaVinciOS-categories.json')
const STORE_DOMAIN = 'homeu.ph'

function main() {
  const { collections } = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'))

  const DaVinciOSCategories = collections.map(c => ({
    title: c.title,
    slug: c.handle,
    description: '',
    image: c.image || null,
    productsCount: c.productsCount,
    seoTitle: c.title,
    seoDescription: '',
    shopifyOriginalUrl: `https://${STORE_DOMAIN}/collections/${c.handle}`,
  }))

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(DaVinciOSCategories, null, 2))
  console.log(`✅ Transformed ${DaVinciOSCategories.length} categories`)
  console.log(`   Wrote: ${OUTPUT_FILE}`)
}

main()
