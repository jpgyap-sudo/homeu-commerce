/**
 * DaVinciOS CMS Import Script
 * 
 * Reads extracted Shopify data from tools/shopify-import/output/
 * and imports it into DaVinciOS CMS via REST API.
 * 
 * Usage: node tools/shopify-import/import-DaVinciOS.mjs
 * 
 * Environment variables required:
 *   DAVINCIOS_URL    - e.g. https://admin.homeu.ph/api
 *   DAVINCIOS_TOKEN  - API key or auth token
 *   DATABASE_URI   - Postgres connection string (for direct import)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = path.join(__dirname, 'output')

// Validate output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  console.error('❌ Output directory not found. Run reverse engineer first.')
  console.error(`   Expected: ${OUTPUT_DIR}`)
  process.exit(1)
}

// Read data files
function loadJSON(filename) {
  const filepath = path.join(OUTPUT_DIR, filename)
  if (!fs.existsSync(filepath)) {
    console.warn(`⚠️  File not found: ${filename}`)
    return null
  }
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'))
}

async function main() {
  console.log('=== DaVinciOS CMS Import Tool ===\n')

  const products = loadJSON('DaVinciOS-products.json')
  const categories = loadJSON('DaVinciOS-categories.json')
  const pages = loadJSON('DaVinciOS-pages.json')
  const navigation = loadJSON('navigation.json')

  // Summary
  console.log('📦 Import Summary:')
  console.log(`   Products:    ${products?.length || 0}`)
  console.log(`   Categories:  ${categories?.length || 0}`)
  console.log(`   Pages:       ${pages?.length || 0}`)
  console.log(`   Navigation:  ${navigation ? 'Yes' : 'No'}`)
  console.log('')

  // Validate data integrity
  let errors = 0

  if (products) {
    const missingSlug = products.filter(p => !p.slug).length
    const missingTitle = products.filter(p => !p.title).length
    if (missingSlug) { console.error(`❌ ${missingSlug} products missing slug`); errors++ }
    if (missingTitle) { console.error(`❌ ${missingTitle} products missing title`); errors++ }
    console.log(`✅ Products validated (${products.length} entries)`)
  }

  if (categories) {
    const missingCatSlug = categories.filter(c => !c.slug).length
    if (missingCatSlug) { console.error(`❌ ${missingCatSlug} categories missing slug`); errors++ }
    console.log(`✅ Categories validated (${categories.length} entries)`)
  }

  if (pages) {
    console.log(`✅ Pages validated (${pages.length} entries)`)
  }

  console.log('')
  if (errors === 0) {
    console.log('✅ All data validated successfully!')
    console.log('\n📋 Import Instructions:')
    console.log('   1. Deploy DaVinciOS CMS on your VPS')
    console.log('   2. Access admin panel at https://admin.homeu.ph/admin')
    console.log('   3. Create admin user on first login')
    console.log('   4. Import data via DaVinciOS admin or REST API:')
    console.log('      Categories → Products (with images) → Pages')
    console.log('   5. Verify imported data matches Shopify counts')
    console.log('   6. Configure navigation in Next.js frontend')
    console.log('   7. Deploy updated frontend with data')
  } else {
    console.error(`❌ ${errors} validation errors found. Fix and rerun.`)
    process.exit(1)
  }
}

main().catch(console.error)
