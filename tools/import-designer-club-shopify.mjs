#!/usr/bin/env node
/**
 * Import a Shopify customer export CSV (Customers filtered by tag
 * "designer" → Export) into designer_club_applications.
 *
 * These are legacy signups via the old Shopify Forms app — only
 * name/email/phone/company/address are available, no position or
 * socials. Inserted with status='contacted' (already previously
 * tagged/engaged) and a note marking the import source. Dedupes by
 * email against existing rows (including the API-paginated batch
 * already imported earlier).
 *
 * Usage:
 *   DATABASE_URI=... node tools/import-designer-club-shopify.mjs <path-to-csv> [--execute]
 *
 * Without --execute, parses and prints a summary only — writes nothing.
 */

import { readFileSync } from 'fs'
import pg from 'pg'

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
    console.error('Usage: node tools/import-designer-club-shopify.mjs <path-to-csv> [--execute]')
    process.exit(1)
  }

  const raw = readFileSync(csvPath, 'utf8')
  const rows = parseCSV(raw)
  const header = rows[0].map(h => h.trim())
  const data = rows.slice(1).map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])))

  console.log(`Parsed ${data.length} rows from ${csvPath}`)
  console.log('Columns:', header.join(', '))

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URI, max: 1 })

  let inserted = 0, skippedDup = 0, skippedNoEmail = 0

  for (const d of data) {
    const email = (d['Email'] || d['email'] || '').trim().toLowerCase()
    if (!email) { skippedNoEmail++; continue }

    if (execute) {
      const existing = await pool.query(
        `SELECT id FROM designer_club_applications WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [email]
      )
      if (existing.rows.length > 0) { skippedDup++; continue }

      const firstName = d['First Name'] || d['first_name'] || ''
      const lastName = d['Last Name'] || d['last_name'] || ''
      const company = d['Company'] || d['company'] || null
      const phone = d['Phone'] || d['phone'] || null
      const addressParts = [d['Address1'], d['Address2'], d['City'], d['Province'], d['Zip']]
        .filter(Boolean).join(', ')

      await pool.query(
        `INSERT INTO designer_club_applications
          (first_name, last_name, email, company_name, company_address, contact_number, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, 'contacted', 'Imported from Shopify (tag: designer)')`,
        [firstName.trim(), lastName.trim(), email, company?.trim() || null, addressParts || null, phone?.trim() || null]
      )
      inserted++
    } else {
      // Dry run: just check for dup against what's already there, no write
      const existing = await pool.query(
        `SELECT id FROM designer_club_applications WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [email]
      )
      if (existing.rows.length > 0) skippedDup++
      else inserted++
    }
  }

  console.log(`\n${execute ? 'Inserted' : 'Would insert'}: ${inserted}`)
  console.log(`Skipped (already imported): ${skippedDup}`)
  console.log(`Skipped (no email): ${skippedNoEmail}`)
  if (!execute) console.log('\nDry run — nothing written. Re-run with --execute to import.')

  await pool.end()
}

main().catch(err => {
  console.error('Import failed:', err.message)
  process.exit(1)
})
