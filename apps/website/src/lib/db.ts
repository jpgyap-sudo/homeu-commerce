import { Pool, QueryResult } from 'pg'

// Singleton PostgreSQL connection pool
let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    const connectionString =
      process.env.DATABASE_URI ||
      process.env.DB_URI ||
      'postgres://homeu:homeu@localhost:5432/homeu'
    pool = new Pool({
      connectionString,
      max: 20,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      allowExitOnIdle: true,
    })
  }
  return pool
}

/**
 * Execute a SQL query using the connection pool directly.
 * pool.query() handles connection acquisition & release internally,
 * avoiding per-query connect/release round-trips.
 */
export async function query(sql: string, params?: any[]): Promise<QueryResult> {
  return getPool().query(sql, params)
}

/**
 * Quotes a table identifier for safe interpolation into SQL. Handles
 * schema-qualified names ('chatbot.leads' -> '"chatbot"."leads"') —
 * wrapping the whole string in one pair of quotes instead would make
 * Postgres treat "chatbot.leads" as a single (nonexistent) relation name,
 * silently failing every query against it.
 */
function quoteTable(table: string): string {
  return table.split('.').map((part) => `"${part}"`).join('.')
}

export async function findOne(
  table: string,
  where: Record<string, any>
): Promise<any | undefined> {
  const keys = Object.keys(where)
  if (keys.length === 0) return undefined
  const conditions = keys.map((k, i) => `"${k}" = $${i + 1}`).join(' AND ')
  const values = keys.map((k) => where[k])
  const { rows } = await query(
    `SELECT * FROM ${quoteTable(table)} WHERE ${conditions} LIMIT 1`,
    values
  )
  return rows[0]
}

export async function find(
  table: string,
  where: Record<string, any> = {},
  opts: { limit?: number; offset?: number; orderBy?: string } = {}
): Promise<any[]> {
  const keys = Object.keys(where)
  const values: any[] = []
  let sql = `SELECT * FROM ${quoteTable(table)}`
  if (keys.length > 0) {
    const conditions = keys.map((k, i) => {
      values.push(where[k])
      return `"${k}" = $${i + 1}`
    }).join(' AND ')
    sql += ` WHERE ${conditions}`
  }
  if (opts.orderBy) sql += ` ORDER BY ${opts.orderBy}`
  if (opts.limit) sql += ` LIMIT ${opts.limit}`
  if (opts.offset) sql += ` OFFSET ${opts.offset}`
  const { rows } = await query(sql, values)
  return rows
}

export async function update(
  table: string,
  id: number,
  data: Record<string, any>
): Promise<any | undefined> {
  const keys = Object.keys(data)
  if (keys.length === 0) return undefined
  const sets = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ')
  const values = keys.map((k) => data[k])
  values.push(id)
  const { rows } = await query(
    `UPDATE ${quoteTable(table)} SET ${sets}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
    values
  )
  return rows[0]
}
