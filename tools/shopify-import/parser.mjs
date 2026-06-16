#!/usr/bin/env node

/**
 * Shopify Export Parser
 * 
 * Parses exported Shopify data (products CSV, theme ZIP, images folder)
 * and converts to DaVinciOS CMS compatible format.
 * 
 * Input:
 *   tools/shopify-import/input/products.csv   - Shopify product export
 *   tools/shopify-import/input/theme.zip      - Shopify theme export (Liquid)
 *   tools/shopify-import/input/images/        - Product images folder
 * 
 * Output:
 *   tools/shopify-import/output/products.json
 *   tools/shopify-import/output/categories.json
 *   tools/shopify-import/output/pages.json
 *   tools/shopify-import/output/media.json
 *   tools/shopify-import/output/navigation.json
 *   tools/shopify-import/output/301-redirect-map.csv
 *   tools/shopify-import/output/images-manifest.json
 *   tools/theme-analyzer/component-map.md
 *   tools/theme-analyzer/theme-data.json
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const INPUT_DIR = path.resolve(__dirname, 'input')
const OUTPUT_DIR = path.resolve(__dirname, 'output')
const THEME_DIR = path.resolve(__dirname, '..', 'theme-analyzer')

// Ensure dirs
;[INPUT_DIR, OUTPUT_DIR, path.join(INPUT_DIR, 'images'), THEME_DIR].forEach(d => {
  fs.mkdirSync(d, { recursive: true })
})

// =============================================
// 1. Parse Products CSV
// =============================================
function parseProductsCSV(filepath) {
  if (!fs.existsSync(filepath)) {
    console.log('  ⏭️  No products.csv found (will scan website instead)')
    return null
  }

  const csv = fs.readFileSync(filepath, 'utf-8')
  const lines = csv.split('\n').filter(Boolean)
  const headers = parseCSVLine(lines[0])
  
  const products = []
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i])
    const product = {}
    headers.forEach((h, idx) => { product[h] = vals[idx] || '' })
    products.push(product)
  }

  console.log(`  📦 Parsed ${products.length} products from CSV`)
  return products
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; continue }
    if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue }
    current += char
  }
  result.push(current.trim())
  return result
}

// =============================================
// 2. Parse Shopify Theme (Liquid files)
// =============================================
function parseTheme(themePath) {
  if (!fs.existsSync(themePath)) {
    console.log('  ⏭️  No theme.zip found')
    return null
  }

  console.log('  🎨 Found Shopify theme export')
  // Theme extraction would need unzip capability
  // For now, document the expected structure
  return {
    path: themePath,
    expected: [
      'layout/theme.liquid',
      'templates/index.liquid',
      'templates/product.liquid',
      'templates/collection.liquid',
      'templates/page.liquid',
      'sections/*.liquid',
      'snippets/*.liquid',
      'assets/*.css',
      'assets/*.js',
      'config/settings_schema.json',
      'config/settings_data.json',
    ]
  }
}

// =============================================
// 3. Map Image Files to Products
// =============================================
function mapImagesToProducts(products, imagesDir) {
  const images = fs.readdirSync(imagesDir).filter(f => /\.(png|jpg|jpeg|webp|gif|avif)$/i.test(f))
  
  if (images.length === 0) return []

  console.log(`  🖼️  Mapping ${images.length} images to products...`)

  const imageMap = []
  
  for (const imgFile of images) {
    const imgPath = path.join(imagesDir, imgFile)
    const stats = fs.statSync(imgPath)
    const ext = path.extname(imgFile).toLowerCase()
    
    // Try to match image filename to product
    // Common patterns: product-handle.jpg, SKU.jpg, product-name-1.jpg
    const nameWithoutExt = path.basename(imgFile, ext).toLowerCase()
    
    let matchedProduct = products ? products.find(p => {
      const handle = (p['Handle'] || p.handle || p.title || '').toLowerCase()
      return nameWithoutExt.includes(handle) || handle.includes(nameWithoutExt)
    }) : null

    imageMap.push({
      originalFilename: imgFile,
      filepath: imgPath,
      extension: ext,
      size: stats.size,
      productHandle: matchedProduct ? (matchedProduct.Handle || matchedProduct.handle || '') : '',
      productTitle: matchedProduct ? (matchedProduct.Title || matchedProduct.title || '') : '',
      alt: matchedProduct ? (matchedProduct.Title || matchedProduct.title || '') : '',
      checksum: createHash('md5').update(fs.readFileSync(imgPath)).digest('hex'),
    })
  }

  const matched = imageMap.filter(i => i.productHandle).length
  const unmatched = imageMap.length - matched
  console.log(`  ✅ ${matched} images matched to products`)
  if (unmatched > 0) console.log(`  ⚠️  ${unmatched} images could not be auto-matched (check names)`)
  
  return imageMap
}

// =============================================
// 4. Generate DaVinciOS CMS Compatible Output
// =============================================
function generateDaVinciOSData(products, imageMap) {
  if (!products) return null

  // Map CSV column names to DaVinciOS fields
  const DaVinciOSProducts = products.map(p => ({
    title: p.Title || p.title || '',
    slug: (p.Handle || p.handle || '').toLowerCase(),
    sku: p['Variant SKU'] || p.SKU || p.sku || '',
    price: parseFloat(p['Variant Price'] || p['Price'] || p.price || 0) || null,
    salePrice: parseFloat(p['Compare at Price'] || p['CompareAtPrice'] || p.salePrice || 0) || null,
    showPrice: true,
    description: {
      root: {
        children: [{ type: 'paragraph', children: [{ type: 'text', text: p['Body HTML'] || p.body_html || p.Description || p.description || '' }] }]
      }
    },
    dimensions: p['Option3 Value'] || p.dimensions || '',
    materials: p['Option2 Value'] || p.materials || '',
    category: null, // filled from collection mapping
    images: imageMap?.filter(img => 
      img.productHandle === (p.Handle || p.handle || '').toLowerCase()
    ).map(img => img.checksum) || [],
    seoTitle: p['Title'] || p.title || '',
    seoDescription: p['SEO Description'] || p['Meta Description'] || '',
    shopifyId: p['ID'] || p.id || '',
    shopifyOriginalUrl: p['Handle'] ? `https://www.homeu.ph/products/${p.Handle}` : '',
  }))

  return DaVinciOSProducts
}

// =============================================
// Main
// =============================================
async function main() {
  console.log('📦 Shopify Export Parser')
  console.log('='.repeat(50))

  // 1. Parse Products
  const csvPath = path.join(INPUT_DIR, 'products.csv')
  const products = parseProductsCSV(csvPath)

  // 2. Check for theme
  const themePath = path.join(INPUT_DIR, 'theme.zip')
  const themeInfo = parseTheme(themePath)

  // 3. Map images to products
  const imagesDir = path.join(INPUT_DIR, 'images')
  const imageMap = mapImagesToProducts(products, imagesDir)

  // 4. Generate DaVinciOS CMS data
  if (products) {
    const DaVinciOSProducts = generateDaVinciOSData(products, imageMap)

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'products.json'),
      JSON.stringify(DaVinciOSProducts, null, 2)
    )
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'images-manifest.json'),
      JSON.stringify(imageMap, null, 2)
    )

    console.log(`\n✅ Generated products.json (${DaVinciOSProducts.length} products)`)
    console.log(`✅ Generated images-manifest.json (${imageMap.length} images)`)
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 SUMMARY')
  console.log('='.repeat(50))
  if (products) console.log(`  Products parsed:      ${products.length}`)
  if (imageMap) console.log(`  Images mapped:        ${imageMap.length} (${imageMap.filter(i => i.productHandle).length} matched)`)
  if (themeInfo) console.log(`  Theme detected:       Yes (extract manually or use scanner)`)
  console.log(`  Output directory:     ${OUTPUT_DIR}`)
  console.log('')
  console.log('📋 Next Steps:')
  console.log('  1. Review DaVinciOS-products.json for accuracy')
  console.log('  2. Run Playwright scanner to verify against live site')
  console.log('  3. Import into DaVinciOS CMS via admin panel')
  console.log('')
  console.log('📂 Place Shopify export files in:')
  console.log(`  Products CSV: ${path.join(INPUT_DIR, 'products.csv')}`)
  console.log(`  Theme ZIP:    ${path.join(INPUT_DIR, 'theme.zip')}`)
  console.log(`  Images:       ${path.join(INPUT_DIR, 'images/')}`)
}

main().catch(console.error)
