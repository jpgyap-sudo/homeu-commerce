#!/usr/bin/env node
/**
 * Import a Judge.me CSV export into the native `reviews` table.
 *
 * Every row lands as status='pending' — nothing is auto-approved or
 * auto-rejected. Fraud signals (disposable email domain, CSV source=admin,
 * high review-count-per-email) are computed and stored in fraud_reasons
 * as advisory flags for the admin moderation queue at /admin/reviews —
 * they never decide anything automatically.
 *
 * Usage:
 *   DATABASE_URI=... node tools/reviews-import-judgeme-csv.mjs <path-to-csv> [--execute]
 *
 * Without --execute, runs in dry-run mode: parses, matches products,
 * computes fraud flags, and prints a summary — writes nothing.
 */

import { readFileSync } from 'fs'
import pg from 'pg'

const DISPOSABLE_DOMAINS = new Set([
  'tutanota.com', 'fanicle.com', 'bmixr.com', 'eoopy.com',
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'throwawaymail.com',
  'yopmail.com', 'trashmail.com', 'temp-mail.org', 'fakeinbox.com',
  'getnada.com', 'sharklasers.com', 'dispostable.com', 'maildrop.cc',
])

// Reviews from these addresses are the store owner/staff reviewing their own
// products — flagged, never auto-rejected, but the admin should know.
const OWNER_EMAILS = new Set(['jpgyap@gmail.com'])

function parseCSV(text) {
  const rows = []
  let row = [], field = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else { inQuotes = false }
      } else field += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') { row.push(field); field = '' }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++
        row.push(field); field = ''
        if (row.length > 1 || row[0] !== '') rows.push(row)
        row = []
      } else field += c
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows
}

async function main() {
  const args = process.argv.slice(2)
  const csvPath = args.find(a => !a.startsWith('--'))
  const execute = args.includes('--execute')

  if (!csvPath) {
    console.error('Usage: node tools/reviews-import-judgeme-csv.mjs <path-to-csv> [--execute]')
    process.exit(1)
  }

  const raw = readFileSync(csvPath, 'utf8')
  const rows = parseCSV(raw)
  const header = rows[0]
  const data = rows.slice(1).map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])))

  console.log(`Parsed ${data.length} rows from ${csvPath}`)

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URI, max: 1 })

  // Email frequency across the whole import — used for the high-volume flag.
  const emailCounts = {}
  for (const d of data) emailCounts[d.reviewer_email] = (emailCounts[d.reviewer_email] || 0) + 1

  let matched = 0, unmatched = 0, flagged = 0, inserted = 0, skippedDup = 0
  const unmatchedHandles = new Set()
  const flagSummary = {}

  for (const d of data) {
    const productRes = await pool.query(
      `SELECT id FROM products WHERE shopify_id = $1 OR slug = $2 LIMIT 1`,
      [d.product_id, d.product_handle]
    )
    const productId = productRes.rows[0]?.id || null
    if (productId) matched++
    else { unmatched++; unmatchedHandles.add(d.product_handle) }

    const reasons = []
    const domain = (d.reviewer_email || '').split('@')[1]?.toLowerCase()
    if (domain && DISPOSABLE_DOMAINS.has(domain)) reasons.push('disposable_email_domain')
    if (OWNER_EMAILS.has((d.reviewer_email || '').toLowerCase())) reasons.push('owner_self_review')
    if (d.source === 'admin') reasons.push('csv_source_admin')
    if (emailCounts[d.reviewer_email] > 3) reasons.push('high_volume_reviewer')
    if (!d.picture_urls?.trim() && !d.body?.trim()) reasons.push('empty_body')

    if (reasons.length > 0) {
      flagged++
      for (const r of reasons) flagSummary[r] = (flagSummary[r] || 0) + 1
    }

    if (!execute) continue

    // Dedupe on rerun: same reviewer + product + original review_date.
    const dupCheck = await pool.query(
      `SELECT id FROM reviews WHERE reviewer_email = $1 AND product_id = $2 AND review_date = $3::timestamptz LIMIT 1`,
      [d.reviewer_email, productId, d.review_date]
    )
    if (dupCheck.rows.length > 0) { skippedDup++; continue }

    await pool.query(
      `INSERT INTO reviews
        (product_id, reviewer_name, reviewer_email, rating, title, body, status,
         fraud_score, fraud_reasons, verified_purchase, source, imported_from_judgeme, review_date)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8::jsonb, false, 'import', true, $9::timestamptz)`,
      [
        productId, d.reviewer_name, d.reviewer_email, parseInt(d.rating, 10),
        d.title, d.body, reasons.length * 25, JSON.stringify(reasons), d.review_date,
      ]
    )
    inserted++
  }

  console.log(`\nProduct matching: ${matched} matched, ${unmatched} unmatched`)
  if (unmatchedHandles.size > 0) {
    console.log(`Unmatched handles (${unmatchedHandles.size}):`, [...unmatchedHandles].slice(0, 20).join(', '))
  }
  console.log(`\nFraud flags: ${flagged}/${data.length} rows flagged`)
  console.log(flagSummary)

  if (execute) {
    console.log(`\nInserted ${inserted} rows, skipped ${skippedDup} duplicates (all status='pending').`)
  } else {
    console.log('\nDry run — nothing written. Re-run with --execute to import.')
  }

  await pool.end()
}

main().catch(err => {
  console.error('Import failed:', err.message)
  process.exit(1)
})
