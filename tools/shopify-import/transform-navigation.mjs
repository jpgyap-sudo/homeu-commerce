#!/usr/bin/env node

/**
 * Transform tools/shopify-import/output/raw/menus.json into
 * Next.js navigation structure (output/navigation.json).
 *
 * Maps Shopify menu item types to internal routes:
 *   COLLECTION -> /categories/{handle}
 *   PRODUCT    -> /products/{handle}
 *   PAGE       -> /pages/{handle}
 *   FRONTPAGE  -> /
 *   everything else (HTTP, BLOG, SEARCH, SHOP_POLICY, ...) -> original url as-is
 *
 * Usage: node tools/shopify-import/transform-navigation.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const INPUT_FILE = path.join(__dirname, 'output', 'raw', 'menus.json')
const OUTPUT_FILE = path.join(__dirname, 'output', 'navigation.json')

function handleFromUrl(url) {
  const match = /\/([^/]+)\/?$/.exec((url || '').split('?')[0])
  return match ? match[1] : ''
}

function mapHref(item) {
  switch (item.type) {
    case 'FRONTPAGE':
      return '/'
    case 'COLLECTION':
      return `/categories/${handleFromUrl(item.url)}`
    case 'PRODUCT':
      return `/products/${handleFromUrl(item.url)}`
    case 'PAGE':
      return `/pages/${handleFromUrl(item.url)}`
    default:
      return item.url
  }
}

function mapItem(item) {
  return {
    title: item.title,
    href: mapHref(item),
    type: item.type,
    items: (item.items || []).map(mapItem),
  }
}

function main() {
  const { menus } = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'))

  const navigation = {}
  for (const menu of menus) {
    navigation[menu.handle] = {
      title: menu.title,
      items: menu.items.map(mapItem),
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(navigation, null, 2))
  console.log(`✅ Transformed ${menus.length} menus: ${menus.map(m => m.handle).join(', ')}`)
  console.log(`   Wrote: ${OUTPUT_FILE}`)
}

main()
