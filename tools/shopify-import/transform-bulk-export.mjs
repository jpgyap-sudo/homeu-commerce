#!/usr/bin/env node

/**
 * Transform the Shopify Admin GraphQL bulk-operation export
 * (tools/shopify-import/output/raw/products-bulk.jsonl)
 * into DaVinciOS CMS compatible format (output/DaVinciOS-products.json).
 *
 * The JSONL file is a flat list of nodes. Root nodes (Products) have no
 * __parentId. Child nodes (variants, images, collections) reference their
 * parent product via __parentId.
 *
 * Usage: node tools/shopify-import/transform-bulk-export.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import readline from 'readline'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const INPUT_FILE = path.join(__dirname, 'output', 'raw', 'products-bulk.jsonl')
const OUTPUT_FILE = path.join(__dirname, 'output', 'products.json')

function gidType(gid) {
  const match = /^gid:\/\/shopify\/(\w+)\//.exec(gid || '')
  return match ? match[1] : null
}

function gidId(gid) {
  const match = /\/(\d+)$/.exec(gid || '')
  return match ? match[1] : gid
}

async function main() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input not found: ${INPUT_FILE}`)
    process.exit(1)
  }

  const products = new Map()
  const variants = new Map()
  const images = new Map()
  const collections = new Map()

  const rl = readline.createInterface({
    input: fs.createReadStream(INPUT_FILE),
    crlfDelay: Infinity,
  })

  for await (const line of rl) {
    if (!line.trim()) continue
    const node = JSON.parse(line)
    const type = gidType(node.id)

    if (!node.__parentId) {
      if (type === 'Product') products.set(node.id, node)
      continue
    }

    const bucket =
      type === 'ProductVariant' ? variants :
      (!type && node.url) ? images :
      (!type && node.handle) ? collections :
      null

    if (!bucket) continue
    if (!bucket.has(node.__parentId)) bucket.set(node.__parentId, [])
    bucket.get(node.__parentId).push(node)
  }

  const STORE_DOMAIN = 'homeu.ph'

  const DaVinciOSProducts = [...products.values()].map(p => {
    const pVariants = variants.get(p.id) || []
    const pImages = images.get(p.id) || []
    const pCollections = collections.get(p.id) || []
    const firstVariant = pVariants[0] || {}

    return {
      shopifyId: gidId(p.id),
      title: p.title,
      slug: p.handle,
      sku: firstVariant.sku || '',
      price: firstVariant.price ? parseFloat(firstVariant.price) : null,
      salePrice: firstVariant.compareAtPrice ? parseFloat(firstVariant.compareAtPrice) : null,
      showPrice: !!firstVariant.price,
      description: p.descriptionHtml || '',
      vendor: p.vendor || '',
      productType: p.productType || '',
      status: p.status,
      images: pImages.map(img => ({
        src: img.url,
        alt: img.altText || p.title,
        width: img.width,
        height: img.height,
      })),
      categoryHandles: pCollections.map(c => c.handle).filter(Boolean),
      seoTitle: p.seo?.title || p.title,
      seoDescription: p.seo?.description || (p.descriptionHtml || '').replace(/<[^>]+>/g, '').substring(0, 160),
      shopifyUrl: `https://${STORE_DOMAIN}/products/${p.handle}`,
      tags: p.tags || [],
      variants: pVariants.map(v => ({
        id: gidId(v.id),
        title: v.title,
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        sku: v.sku,
        inventoryQuantity: v.inventoryQuantity,
        available: (v.inventoryQuantity ?? 0) > 0,
      })),
    }
  })

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(DaVinciOSProducts, null, 2))

  console.log(`✅ Transformed ${DaVinciOSProducts.length} products`)
  console.log(`   Variants: ${[...variants.values()].reduce((s, a) => s + a.length, 0)}`)
  console.log(`   Images:   ${[...images.values()].reduce((s, a) => s + a.length, 0)}`)
  console.log(`   Wrote:    ${OUTPUT_FILE}`)
}

main()
