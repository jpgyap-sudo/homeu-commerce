#!/usr/bin/env node
/**
 * Import Shopify customers CSV - simplified for Docker execution.
 * Run inside the website container where 'pg' is available.
 * Usage: node tools/import-customers-docker.mjs <path-to-csv>
 */
import { readFileSync, existsSync } from 'fs'
import pg from 'pg'

const csvPath = process.argv[2]
if (!csvPath || !existsSync(csvPath)) {
  console.error('Usage: node tools/import-customers-docker.mjs <path-to-csv>')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URI })

async function main() {
  const text = readFileSync(csvPath, 'utf-8')
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())

  let imported = 0, skipped = 0, designers = 0

  for (const line of lines.slice(1)) {
    const vals = parseCSVLine(line)
    const row = {}
    headers.forEach((h, i) => { row[h] = (vals[i] || '').trim() })

    const email = row.Email.toLowerCase().replace(/^'/, '').trim()
    if (!email) { skipped++; continue }
    const firstName = row['First Name'] || ''
    const lastName = row['Last Name'] || ''
    const name = [firstName, lastName].filter(Boolean).join(' ') || email.split('@')[0]
    const phone = row['Default Address Phone'] || row.Phone || ''
    const company = row['Default Address Company'] || ''
    const tags = (row.Tags || '').toLowerCase()
    const isDesigner = tags.includes('designer') || tags.includes('trade') || tags.includes('wholesale')

    // Upsert customer
    await pool.query(
      `INSERT INTO customers (email, name, phone, company, status, role, created_at, updated_at)
       VALUES ($1,$2,$3,$4,'active','customer',NOW(),NOW())
       ON CONFLICT (email) DO UPDATE SET name=COALESCE(NULLIF($2,''), customers.name), updated_at=NOW()`,
      [email, name, phone || null, company || null]
    )
    imported++

    // Sync designer
    if (isDesigner) {
      const exists = await pool.query('SELECT id FROM designer_club_applications WHERE LOWER(email)=LOWER($1)', [email])
      if (exists.rows.length === 0) {
        await pool.query(
          `INSERT INTO designer_club_applications (first_name,last_name,email,company_name,status,notes,created_at)
           VALUES ($1,$2,$3,$4,'approved','Imported from Shopify. Tags: ' || $5,NOW())`,
          [firstName, lastName, email, company || 'Unknown', row.Tags || '']
        )
        designers++
      }
    }
  }

  await pool.end()
  console.log(`Imported: ${imported} customers, Designers synced: ${designers}, Skipped: ${skipped}`)
  const count = await (await fetch('http://postgres:5432')).json() // nop
}

function parseCSVLine(line) {
  const result = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') { inQ = !inQ; continue }
    if (c === ',' && !inQ) { result.push(cur); cur = ''; continue }
    cur += c
  }
  result.push(cur)
  return result
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1) })
