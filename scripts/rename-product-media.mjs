/**
 * Rename all product media filenames to their product names.
 *
 * This is SAFE because:
 *   - `media.filename` is purely cosmetic (display + search only)
 *   - Image identity is by sha256 hash (from the CDN URL), never by filename
 *   - No foreign key references media.filename anywhere
 *   - The sync process (ON CONFLICT upsert by sha256) does NOT overwrite filename
 *
 * Run: node scripts/rename-product-media.mjs
 */

import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URI || 'postgres://homeu:homeu_local_password@localhost:5432/homeu',
})

// ── Helpers ────────────────────────────────────────────────────────────

/** Sanitize a string to be a safe, readable filename fragment */
function sanitize(str) {
  return str
    .replace(/[^\w\s\-'.()&,]/g, '')       // remove truly illegal chars (keep letters, numbers, spaces, hyphens, apostrophes, dots, parens, ampersands, commas)
    .replace(/\s+/g, ' ')                   // collapse whitespace
    .trim()
    .substring(0, 100)                      // cap length so the full filename stays under ~160
}

/** Extract file extension from a URL */
function getExt(url) {
  const m = url.match(/\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i)
  return m ? m[1].toLowerCase() : 'jpg'
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  const client = await pool.connect()
  try {
    console.log('🔍 Fetching product-image-media linkage...')

    // 1) Get every product image row with its linked media id and product title
    const { rows: productImages } = await client.query(`
      SELECT 
        pi.url,
        pi.product_id,
        pi.sort_order,
        p.title AS product_title,
        m.id AS media_id,
        m.filename AS old_filename
      FROM product_images pi
      JOIN products p ON p.id = pi.product_id
      JOIN media m ON m.url = pi.url
      ORDER BY pi.product_id ASC, pi.sort_order ASC
    `)

    console.log(`   Found ${productImages.length} product image rows across ${new Set(productImages.map(r => r.product_id)).size} products`)

    // 2) Identify shared images (same URL → multiple products)
    const urlToProducts = new Map()
    for (const row of productImages) {
      if (!urlToProducts.has(row.url)) urlToProducts.set(row.url, new Set())
      urlToProducts.get(row.url).add(row.product_title)
    }

    // 3) Track filename collisions so we can uniquify
    const usedFilenames = new Map() // filename → count

    function makeUniqueFilename(base, ext) {
      let candidate = `${base}.${ext}`
      if (!usedFilenames.has(candidate)) {
        usedFilenames.set(candidate, 0)
        return candidate
      }
      // Already taken — append a counter
      let seq = (usedFilenames.get(candidate) || 0) + 1
      usedFilenames.set(candidate, seq)
      candidate = `${base}-${seq}.${ext}`
      // If STILL taken (unlikely but possible), increment until free
      while (usedFilenames.has(candidate)) {
        seq++
        candidate = `${base}-${seq}.${ext}`
      }
      usedFilenames.set(candidate, 0)
      return candidate
    }

    // 4) Build per-media-row filename
    //    Group by media_id (since one media row = one file, even if shared across products)
    const mediaUpdates = new Map() // media_id → { media_id, new_filename, old_filename, sort_order }

    for (const row of productImages) {
      if (mediaUpdates.has(row.media_id)) {
        // Already handled this media file
        continue
      }

      const ext = getExt(row.url)
      const titles = [...urlToProducts.get(row.url)]

      // Build the base name
      let baseName
      if (titles.length === 1) {
        baseName = sanitize(titles[0])
      } else {
        // Shared image — join product names
        baseName = sanitize(titles.join(' | '))
      }

      if (!baseName) {
        baseName = `product-${row.product_id}`
      }

      // For multi-image products, also add the sort order to the filename
      const sortOrder = row.sort_order

      let baseWithOrder
      if (sortOrder > 0) {
        baseWithOrder = `${baseName}-${sortOrder}`
      } else {
        baseWithOrder = baseName
      }

      const newFilename = makeUniqueFilename(baseWithOrder, ext)

      mediaUpdates.set(row.media_id, {
        media_id: row.media_id,
        new_filename: newFilename,
        old_filename: row.old_filename,
      })
    }

    console.log(`\n📋 Rename plan:`)
    console.log(`   Total media rows to update: ${mediaUpdates.size}`)
    const changes = [...mediaUpdates.values()].filter(u => u.old_filename !== u.new_filename)
    console.log(`   Actually changing: ${changes.length}`)
    const unchanged = [...mediaUpdates.values()].filter(u => u.old_filename === u.new_filename)
    console.log(`   Already matching: ${unchanged.length}`)

    if (changes.length > 0) {
      // Show a few examples
      console.log(`\n📝 Sample changes (first 10):`)
      for (const c of changes.slice(0, 10)) {
        console.log(`   [${c.media_id}] "${c.old_filename}" → "${c.new_filename}"`)
      }
      if (changes.length > 10) {
        console.log(`   ... and ${changes.length - 10} more`)
      }

      console.log(`\n💾 Applying updates...`)

      // Update in batches to avoid huge transactions
      let updated = 0
      const batchSize = 100
      for (let i = 0; i < changes.length; i += batchSize) {
        const batch = changes.slice(i, i + batchSize)
        // Use a series of individual UPDATEs to avoid type inference issues with VALUES
      for (const c of batch) {
        await client.query(
          `UPDATE media SET filename = $1, updated_at = NOW() WHERE id = $2`,
          [c.new_filename, c.media_id]
        )
      }
        updated += batch.length
        console.log(`   ... ${updated}/${changes.length} updated`)
      }

      console.log(`\n✅ All ${updated} media filenames updated successfully!`)
    } else {
      console.log(`\n✅ Nothing to change — all filenames already match.`)
    }

  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(err => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})
