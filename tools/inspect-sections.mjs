import pg from 'pg'
const connectionString = process.env.DATABASE_URI || 'postgres://homeu:homeu@localhost:5432/homeu'
const pool = new pg.Pool({ connectionString, max: 1 })
const res = await pool.query('select template, count(id) from homepage_sections group by template')
console.log(JSON.stringify(res.rows, null, 2))
await pool.end()
