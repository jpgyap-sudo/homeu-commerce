/**
 * audit-admin-wiring.mjs
 * =======================
 * Systematic sweep for the exact class of bug found 3 times this session
 * (inventory_tracked/inventory_quantity/sales_channel, categories.parent_id):
 * code references a column (in an INSERT list, an `allowedFields` PATCH set,
 * or a `row.<column>` response mapping) that doesn't actually exist in the
 * live Postgres schema — so the field silently always reads null, or writes
 * throw "column does not exist" (caught and surfaced as a generic 500).
 *
 * Heuristic, not exhaustive: regex-scans api/**\/route.ts for
 *   - INSERT INTO <table> (col, col, ...)
 *   - UPDATE <table> SET ... (covered via allowedFields sets)
 *   - allowedFields = new Set([...])
 *   - FROM <table> ... (to know which table a SELECT/row.x mapping belongs to)
 * then cross-checks every column name found against information_schema.
 *
 * Usage: DATABASE_URI=... node tools/audit-admin-wiring.mjs
 */
import fs from 'fs'
import path from 'path'
import pg from 'pg'

const API_DIR = path.join(process.cwd(), 'apps/website/src/app/api')
const conn = process.env.DATABASE_URI || process.env.DATABASE_URL || 'postgres://homeu:homeu@localhost:5432/homeu'
const pool = new pg.Pool({ connectionString: conn, connectionTimeoutMillis: 8000 })

function walk(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(p))
    else if (entry.name === 'route.ts') out.push(p)
  }
  return out
}

async function loadSchema() {
  const r = await pool.query(`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public' ORDER BY table_name, ordinal_position
  `)
  const schema = new Map()
  for (const row of r.rows) {
    if (!schema.has(row.table_name)) schema.set(row.table_name, new Set())
    schema.get(row.table_name).add(row.column_name)
  }
  return schema
}

function findIssues(file, text, schema) {
  const issues = []
  const KNOWN_TABLES = [...schema.keys()]

  // 1. INSERT INTO table (col1, col2, ...)
  const insertRe = /INSERT INTO\s+"?(\w+)"?\s*\(([^)]+)\)/gi
  let m
  while ((m = insertRe.exec(text))) {
    const table = m[1]
    if (!schema.has(table)) continue
    const cols = m[2].split(',').map(c => c.trim().replace(/"/g, ''))
    for (const col of cols) {
      if (col && !schema.get(table).has(col)) {
        issues.push({ table, column: col, kind: 'INSERT column missing from schema' })
      }
    }
  }

  // 2. allowedFields = new Set([...]) — paired with the nearest preceding
  //    UPDATE table SET in the same file (PATCH handlers always follow this
  //    pattern: allowedFields defined, then `UPDATE ${table} SET ${setClauses}`)
  const updateTableMatch = text.match(/UPDATE\s+"?(\w+)"?\s+SET/i)
  if (updateTableMatch) {
    const table = updateTableMatch[1]
    const setMatch = text.match(/allowedFields\s*=\s*new Set\(\[([\s\S]*?)\]\)/)
    if (setMatch && schema.has(table)) {
      const cols = [...setMatch[1].matchAll(/'([a-z0-9_]+)'/gi)].map(x => x[1])
      for (const col of cols) {
        if (!schema.get(table).has(col)) {
          issues.push({ table, column: col, kind: 'allowedFields (PATCH) column missing from schema' })
        }
      }
    }
  }

  // 3. row.<column> / cat.<column> / p.<column> style access, matched against
  //    a FROM <table> in the same file — lower confidence, report separately.
  const fromMatch = text.match(/FROM\s+"?(\w+)"?\s+(?:AS\s+)?(\w{1,3})\b/i)
  if (fromMatch && schema.has(fromMatch[1])) {
    const [, table, alias] = fromMatch
    const accessRe = new RegExp(`\\b${alias}\\.(\\w+)\\b`, 'g')
    const seen = new Set()
    let am
    while ((am = accessRe.exec(text))) {
      const col = am[1]
      if (seen.has(col)) continue
      seen.add(col)
      // Skip obvious JS method calls / known non-column identifiers
      if (['rows', 'length', 'map', 'filter', 'query', 'end', 'release'].includes(col)) continue
      if (!schema.get(table).has(col)) {
        issues.push({ table, column: col, kind: `row alias "${alias}." access missing from schema (low confidence)` })
      }
    }
  }

  return issues
}

async function main() {
  const schema = await loadSchema()
  const files = walk(API_DIR)
  const allIssues = []
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8')
    const issues = findIssues(file, text, schema)
    if (issues.length) {
      const rel = path.relative(process.cwd(), file)
      for (const issue of issues) allIssues.push({ file: rel, ...issue })
    }
  }

  // De-dupe + group by file
  const byFile = new Map()
  for (const issue of allIssues) {
    if (!byFile.has(issue.file)) byFile.set(issue.file, [])
    byFile.get(issue.file).push(issue)
  }

  console.log(`Scanned ${files.length} route.ts files.\n`)
  if (byFile.size === 0) {
    console.log('No issues found.')
  } else {
    for (const [file, issues] of byFile) {
      console.log(file)
      const dedup = [...new Map(issues.map(i => [`${i.table}.${i.column}.${i.kind}`, i])).values()]
      for (const i of dedup) console.log(`  [${i.table}.${i.column}] ${i.kind}`)
      console.log('')
    }
  }
  await pool.end()
}

main().catch(e => { console.error(e); process.exit(1) })
