#!/usr/bin/env node
/**
 * Import Shopify customers CSV export into the `customers` table.
 *
 * Also syncs tagged "designer" customers into `designer_club_applications`.
 *
 * Usage:
 *   Unzip customers_export.zip → customers_export.csv
 *   DATABASE_URI=postgres://homeu:PASS@postgres:5432/homeu \
 *     node tools/import-shopify-customers.mjs customers_export.csv [--execute]
 *
 * Without --execute: dry-run (shows what would be imported)
 * With --execute: actually imports
 */

import { readFileSync, existsSync } from 'fs'
import { parse } from 'path'
import pg from 'pg'

const [, , csvPath, ...flags] = process.argv
const isDryRun = !flags.includes('--execute')

if (!csvPath || !existsSync(csvPath)) {
  console.error('Usage: node tools/import-shopify-customers.mjs <path-to-csv> [--execute]')
  console.error('       Unzip customers_export.zip first — it contains the CSV file.')
  process.exit(1)
}

// Parse CSV manually (no dependencies)
function parseCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return { headers: [], rows: [] }

  // Parse header
  const headers = parseLine(lines[0])
  const rows = lines.slice(1).map(line => {
    const values = parseLine(line)
    const row = {}
    headers.forEach((h, i) => { row[h] = values[i] || '' })
    return row
  })
  return { headers, rows }
}

function parseLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes; continue }
    if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue }
    current += ch
  }
  result.push(current.trim())
  return result
}

async function main() {
  const csv = readFileSync(csvPath, 'utf-8')
  const { headers, rows } = parseCSV(csv)

  console.log(`\n📋 Shopify Customers CSV Import`)
  console.log(`   File: ${csvPath}`)
  console.log(`   Headers: ${headers.length}`)
  console.log(`   Rows: ${rows.length}`)
  console.log(`   Mode: ${isDryRun ? '🔍 DRY RUN (no changes)' : '⚡ LIVE IMPORT'}\n`)

  // Connect to DB
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URI || 'postgres://homeu:homeu@localhost:5432/homeu',
  })

  try {
    await pool.query('SELECT 1')
  } catch {
    console.error('❌ Cannot connect to database. Set DATABASE_URI environment variable.')
    process.exit(1)
  }

  let imported = 0
  let skipped = 0
  let designers = 0
  const errors = []

  for (const row of rows) {
    const email = (row.Email || '').toLowerCase().trim().replace(/^'/, '')  // Remove leading quote
    const firstName = (row['First Name'] || '').trim()
    const lastName = (row['Last Name'] || '').trim()
    const name = [firstName, lastName].filter(Boolean).join(' ') || email.split('@')[0]
    const phone = (row['Default Address Phone'] || row.Phone || '').trim()
    const company = (row['Default Address Company'] || '').trim()
    const tags = (row.Tags || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
    const note = (row.Note || '').trim()
    const totalSpent = parseFloat(row['Total Spent'] || '0') || 0
    const orderCount = parseInt(row['Total Orders'] || '0') || 0
    const acceptsMarketing = (row['Accepts Email Marketing'] || '').toLowerCase() === 'yes'
    const createdAt = row['Created At'] || new Date().toISOString()
    const isDesigner = tags.includes('designer') || tags.includes('trade') || tags.includes('wholesale')
    const city = (row['Default Address City'] || '').trim()
    const province = (row['Default Address Province Code'] || '').trim()
    const address1 = (row['Default Address Address1'] || '').trim()
    const address2 = (row['Default Address Address2'] || '').trim()
    const address = [address1, address2, city, province].filter(Boolean).join(', ')

    if (!email) { skipped++; continue }

    if (isDryRun) {
      imported++
      if (isDesigner) designers++
      continue
    }

    try {
      // Check if customer already exists
      const existing = await pool.query('SELECT id FROM customers WHERE LOWER(email) = $1', [email])
      if (existing.rows.length > 0) {
        // Update tags and company
        await pool.query(
          `UPDATE customers SET
             name = COALESCE(NULLIF($1, ''), name),
             phone = COALESCE(NULLIF($2, ''), phone),
             company = COALESCE(NULLIF($3, ''), company),
             notes = CASE
               WHEN $4::text != '' AND notes IS NULL THEN $4
               WHEN $4::text != '' AND notes != '' THEN notes || E'\n' || $4
               ELSE notes
             END,
             updated_at = NOW()
           WHERE id = $5`,
          [name, phone, company, note, existing.rows[0].id]
        )
        skipped++
      } else {
        // Insert new customer
        await pool.query(
          `INSERT INTO customers (email, name, phone, company, notes, address, status, role, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'active', 'customer', $7, NOW())`,
          [email, name, phone || null, company || null, note || null, address || null, createdAt]
        )
        imported++
      }

      // If tagged as designer, also create designer_club_applications entry
      if (isDesigner) {
        const existingApp = await pool.query(
          'SELECT id FROM designer_club_applications WHERE LOWER(email) = $1',
          [email]
        )
        if (existingApp.rows.length === 0) {
          await pool.query(
            `INSERT INTO designer_club_applications
             (first_name, last_name, email, company_name, company_address, contact_number, status, notes, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, 'approved', $7, $8)`,
            [firstName, lastName, email, company || null, address || null, phone || null,
             `Imported from Shopify. Tags: ${tags.join(', ')}${note ? '\nNote: ' + note : ''}`, createdAt]
          )
          designers++
        }
      }
    } catch (err) {
      errors.push(`${email}: ${err.message}`)
    }
  }

  await pool.end()

  console.log(`\n📊 Results:`)
  console.log(`   ✅ Imported: ${imported} customers`)
  console.log(`   ⏭️  Skipped (existing): ${skipped}`)
  console.log(`   🎨 Designers synced: ${designers}`)
  if (errors.length > 0) {
    console.log(`   ❌ Errors: ${errors.length}`)
    errors.slice(0, 5).forEach(e => console.log(`     - ${e}`))
  }

  if (isDryRun) {
    console.log(`\n🔍 DRY RUN — No changes made. Run with --execute to import.`)
  }

  process.exit(errors.length > 0 && imported === 0 ? 1 : 0)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
