import { Pool, QueryResult } from 'pg'

// Singleton PostgreSQL connection pool
let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    const connectionString =
      process.env.DATABASE_URI ||
      process.env.DB_URI ||
      'postgres://homeu:homeu@localhost:5432/homeu'
    pool = new Pool({ connectionString, max: 10 })
  }
  return pool
}

export async function query(sql: string, params?: any[]): Promise<QueryResult> {
  const client = await getPool().connect()
  try {
    return await client.query(sql, params)
  } finally {
    client.release()
  }
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
    `SELECT * FROM "${table}" WHERE ${conditions} LIMIT 1`,
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
  let sql = `SELECT * FROM "${table}"`
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
    `UPDATE "${table}" SET ${sets}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
    values
  )
  return rows[0]
}
