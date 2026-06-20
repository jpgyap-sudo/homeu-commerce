import pg from 'pg';

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export async function query(text, params = []) {
  const started = Date.now();
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('DB error', { text, ms: Date.now() - started, error: error.message });
    throw error;
  }
}
