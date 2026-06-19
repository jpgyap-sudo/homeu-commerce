const { Pool } = require('pg')

// Singleton PostgreSQL connection pool
// Reuses same pool pattern from apps/website/src/lib/db.ts
let pool = null

function getPool() {
  if (!pool) {
    const connectionString =
      process.env.DATABASE_URL ||
      process.env.DATABASE_URI ||
      'postgres://homeu:homeu_local_password@localhost:5432/homeu'
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

async function query(sql, params = []) {
  return getPool().query(sql, params)
}

async function findOne(table, where = {}) {
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

async function find(table, where = {}, opts = {}) {
  const keys = Object.keys(where)
  const values = []
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

async function update(table, id, data) {
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

async function insert(table, data) {
  const keys = Object.keys(data)
  if (keys.length === 0) return undefined
  const columns = keys.map((k) => `"${k}"`).join(', ')
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ')
  const values = keys.map((k) => data[k])
  const { rows } = await query(
    `INSERT INTO "${table}" (${columns}) VALUES (${placeholders}) RETURNING *`,
    values
  )
  return rows[0]
}

module.exports = {
  query,
  findOne,
  find,
  update,
  insert,
  getPool,
}
