import { readFileSync } from 'fs'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URI })
const csvPath = process.argv[2] || 'customers_export.csv'

async function main() {
  const text = readFileSync(csvPath, 'utf-8')
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const headers = parseLine(lines[0]).map(h => h.replace(/"/g, '').trim())

  let imported = 0, skipped = 0, designers = 0

  for (const line of lines.slice(1)) {
    const vals = parseLine(line)
    const row = {}
    headers.forEach((h, i) => { row[h] = (vals[i] || '').trim() })

    const email = (row.Email || '').toLowerCase().replace(/^'/, '').trim()
    if (!email) { skipped++; continue }
    const fn = row['First Name'] || ''
    const ln = row['Last Name'] || ''
    const name = [fn, ln].filter(Boolean).join(' ') || email.split('@')[0]
    const phone = row['Default Address Phone'] || row.Phone || ''
    const company = row['Default Address Company'] || ''
    const tags = (row.Tags || '').toLowerCase()
    const isDesigner = tags.includes('designer') || tags.includes('trade') || tags.includes('wholesale')

    await pool.query(
      `INSERT INTO customers (email, name, phone, company, status, role, created_at, updated_at)
       VALUES ($1,$2,$3,$4,'active','customer',NOW(),NOW())
       ON CONFLICT (email) DO UPDATE SET
         name = COALESCE(NULLIF($2,''), customers.name),
         phone = COALESCE(NULLIF($3,''), customers.phone),
         company = COALESCE(NULLIF($4,''), customers.company),
         updated_at = NOW()`,
      [email, name, phone || null, company || null]
    )
    imported++

    if (isDesigner) {
      const exists = await pool.query('SELECT id FROM designer_club_applications WHERE LOWER(email)=LOWER($1)', [email])
      if (exists.rows.length === 0) {
        await pool.query(
          `INSERT INTO designer_club_applications (first_name,last_name,email,company_name,status,notes,created_at)
           VALUES ($1,$2,$3,$4,'approved','Imported from Shopify. Tags: ' || $5, NOW())`,
          [fn, ln, email, company || 'Unknown', row.Tags || '']
        )
        designers++
      }
    }
  }

  await pool.end()
  console.log(`\n✅ Import complete.`)
  console.log(`   Customers imported/updated: ${imported}`)
  console.log(`   Skipped (no email): ${skipped}`)
  console.log(`   Designers synced: ${designers}`)
}

function parseLine(l) {
  const r = []; let c = '', q = false
  for (let i = 0; i < l.length; i++) {
    const ch = l[i]
    if (ch === '"') { q = !q; continue }
    if (ch === ',' && !q) { r.push(c); c = ''; continue }
    c += ch
  }
  r.push(c); return r
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1) })
