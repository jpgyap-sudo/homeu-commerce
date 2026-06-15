#!/usr/bin/env node

/**
 * Build a 301 redirect map (old Shopify path -> new site path) from the
 * already-migrated data, using each record's shopifyOriginalUrl + slug.
 *
 * Reads: output/daVinciOS-products.json, output/daVinciOS-categories.json,
 *        output/daVinciOS-pages.json
 * Writes: output/redirects.json
 *
 * Usage: node tools/shopify-import/generate-redirects.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = path.join(__dirname, 'output')

function loadJSON(filename) {
  const filepath = path.join(OUTPUT_DIR, filename)
  if (!fs.existsSync(filepath)) return []
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'))
}

function pathFromUrl(url) {
  if (!url) return null
  try {
    return new URL(url).pathname
  } catch {
    return url.startsWith('/') ? url : `/${url}`
  }
}

function main() {
  const products = loadJSON('daVinciOS-products.json')
  const categories = loadJSON('daVinciOS-categories.json')
  const pages = loadJSON('daVinciOS-pages.json')

  // Product count per category handle, used to prioritize which redirects
  // matter most for SEO (categories with more products = more search traffic).
  const productCountByHandle = {}
  for (const p of products) {
    for (const h of p.categoryHandles || []) {
      productCountByHandle[h] = (productCountByHandle[h] || 0) + 1
    }
  }
  function priorityFor(handle) {
    const count = productCountByHandle[handle] || 0
    if (count >= 50) return 'high'
    if (count >= 5) return 'medium'
    return 'low'
  }

  const redirects = []
  const seen = new Set()

  function add(fromPath, toPath, sourceType, priority) {
    if (!fromPath || !toPath || fromPath === toPath) return
    if (seen.has(fromPath)) return
    seen.add(fromPath)
    redirects.push({ fromPath, toPath, redirectType: '301', status: 'pending', sourceType, priority: priority || 'medium' })
  }

  for (const c of categories) {
    add(pathFromUrl(c.shopifyOriginalUrl), `/categories/${c.slug}`, 'category', priorityFor(c.slug))
  }
  for (const p of products) {
    add(pathFromUrl(p.shopifyOriginalUrl || p.shopifyUrl), `/products/${p.slug}`, 'product')
  }
  for (const p of pages) {
    add(pathFromUrl(p.shopifyOriginalUrl), `/pages/${p.slug}`, 'page')
  }

  const outFile = path.join(OUTPUT_DIR, 'redirects.json')
  fs.writeFileSync(outFile, JSON.stringify(redirects, null, 2))
  console.log(`✅ Generated ${redirects.length} redirects`)
  console.log(`   categories: ${categories.length}, products: ${products.length}, pages: ${pages.length}`)
  console.log(`   Wrote: ${outFile}`)
}

main()
