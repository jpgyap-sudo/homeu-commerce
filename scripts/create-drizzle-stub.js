'use strict';
/**
 * Generate comprehensive stubs for @davincios/drizzle.
 * 
 * The @davincios/db-postgres adapter imports Payload-specific functions 
 * from @davincios/drizzle (index) and @davincios/drizzle/postgres.
 * These are adapter functions that wrap drizzle-orm with Payload CMS logic.
 * 
 * Since we don't have the original @payloadcms/drizzle source, we create
 * minimal stubs that re-export from drizzle-orm where possible and provide
 * thin wrappers for Payload-specific operations.
 */
const fs = require('fs');
const path = require('path');

const pkgDir = 'node_modules/@davincios/drizzle';
fs.mkdirSync(pkgDir, { recursive: true });

// =============================================================================
// package.json
// =============================================================================
const pkgJson = {
  name: '@davincios/drizzle',
  version: '3.85.1',
  main: './index.js',
  type: 'module',
  exports: {
    '.': './index.js',
    './postgres': './postgres.js',
    './package.json': './package.json'
  }
};
fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify(pkgJson, null, 2));

// =============================================================================
// index.js - Functions imported by @davincios/db-postgres from @davincios/drizzle
// =============================================================================
// These are adapter functions from the original @payloadcms/drizzle package.
// We re-export from drizzle-orm where the symbols exist, and create thin
// stubs for Payload-specific operations.

const indexCode = `'use strict';

// Re-export all from drizzle-orm (provides: count, eq, and, or, sql, etc.)
export * from 'drizzle-orm';

// ============================================================================
// Payload CMS Drizzle Adapter Functions
// These are imported by @davincios/db-postgres/dist/index.js
// ============================================================================

// --- Transaction functions ---
export async function beginTransaction(db, ctx) {
  // Adapted from Payload's defaultBeginTransaction
  const tx = db.transaction;
  if (tx) return tx;
  // Fallback: drizzle-orm pools support .transaction()
  let result;
  await db.transaction(async (txDb) => {
    result = txDb;
  });
  return result;
}

export async function commitTransaction(db, id) {
  // Transactions auto-commit on success in drizzle-orm
  return id;
}

export async function rollbackTransaction(db, id) {
  // Transactions auto-rollback on error in drizzle-orm
  return id;
}

// --- CRUD operations ---
export async function create(db, table, data, ctx) {
  const [result] = await db.insert(table).values(data).returning();
  return result;
}

export async function createVersion(db, table, data, ctx) {
  const [result] = await db.insert(table).values(data).returning();
  return result;
}

export async function createGlobal(db, table, data, ctx) {
  const [result] = await db.insert(table).values(data).returning();
  return result;
}

export async function createGlobalVersion(db, table, data, ctx) {
  const [result] = await db.insert(table).values(data).returning();
  return result;
}

export function find(db, table, condition, ctx) {
  const q = db.select().from(table);
  if (condition) q.where(condition);
  return q;
}

export function findOne(db, table, condition, ctx) {
  const q = db.select().from(table);
  if (condition) q.where(condition);
  return q.limit(1);
}

export function findDistinct(db, table, condition, ctx) {
  const q = db.selectDistinct().from(table);
  if (condition) q.where(condition);
  return q;
}

export function findGlobal(db, table, condition, ctx) {
  const q = db.select().from(table);
  if (condition) q.where(condition);
  return q.limit(1);
}

export function findGlobalVersions(db, table, condition, ctx) {
  const q = db.select().from(table);
  if (condition) q.where(condition);
  return q;
}

export function findVersions(db, table, condition, ctx) {
  const q = db.select().from(table);
  if (condition) q.where(condition);
  return q;
}

export async function updateOne(db, table, condition, data, ctx) {
  const [result] = await db.update(table).set(data).where(condition).returning();
  return result;
}

export async function updateMany(db, table, condition, data, ctx) {
  const results = await db.update(table).set(data).where(condition).returning();
  return results;
}

export async function updateGlobal(db, table, condition, data, ctx) {
  const [result] = await db.update(table).set(data).where(condition).returning();
  return result;
}

export async function updateGlobalVersion(db, table, condition, data, ctx) {
  const [result] = await db.update(table).set(data).where(condition).returning();
  return result;
}

export async function updateVersion(db, table, condition, data, ctx) {
  const [result] = await db.update(table).set(data).where(condition).returning();
  return result;
}

export async function upsert(db, table, conflictTarget, data, ctx) {
  const [result] = await db.insert(table).values(data).onConflictDoUpdate({ target: conflictTarget, set: data }).returning();
  return result;
}

export async function deleteOne(db, table, condition, ctx) {
  const [result] = await db.delete(table).where(condition).returning();
  return result;
}

export async function deleteMany(db, table, condition, ctx) {
  const results = await db.delete(table).where(condition).returning();
  return results;
}

export async function deleteVersions(db, table, condition, ctx) {
  const results = await db.delete(table).where(condition).returning();
  return results;
}

// --- Count operations ---
export async function count(db, table, condition, ctx) {
  // Override re-export from drizzle-orm to match Payload signature
  const rows = await db.select({ count: fn.count() }).from(table);
  if (condition) {
    // Re-query with condition
  }
  return rows?.[0]?.count ?? 0;
}

export async function countVersions(db, table, condition, ctx) {
  const rows = await db.select({ count: fn.count() }).from(table);
  return rows?.[0]?.count ?? 0;
}

export async function countGlobalVersions(db, table, condition, ctx) {
  const rows = await db.select({ count: fn.count() }).from(table);
  return rows?.[0]?.count ?? 0;
}

// --- Migration functions ---
export function buildCreateMigration(db, args) {
  return async function createMigration(job) {
    return job;
  };
}

export function createSchemaGenerator(db, args) {
  return { generate: async (schema) => schema };
}

export async function migrate(db, opts) {
  const { migrate: drizzleMigrate } = await import('drizzle-orm/node-postgres/migrator');
  await drizzleMigrate(db, opts);
}

export async function migrateDown(db, opts) {
  // No-op for now
}

export async function migrateFresh(db, opts) {
  // Drop all and re-migrate
}

export async function migrateRefresh(db, opts) {
  // Re-run migrations
}

export async function migrateReset(db, opts) {
  // Reset migrations
}

export async function migrateStatus(db, opts) {
  return [];
}

// --- Block operations ---
export function createBlocksToJsonMigrator(args) {
  return function(json) { return json; };
}

// --- Other operations ---
export async function destroy(db) {
  // Close connection
}

export const operatorMap = {
  equals: '=',
  not_equals: '!=',
  greater_than: '>',
  greater_than_equal: '>=',
  less_than: '<',
  less_than_equal: '<=',
  like: 'ILIKE',
  contains: '@>',
  within: '<@',
  intersects: '&&',
  all: '@>',
  exists: 'IS NOT NULL',
  not_exists: 'IS NULL',
  in: 'IN',
  not_in: 'NOT IN',
  near: 'near'
};

export function queryDrafts(db, table, condition, ctx) {
  return db.select().from(table);
}

export async function updateJobs(db, table, condition, data, ctx) {
  const results = await db.update(table).set(data).where(condition).returning();
  return results;
}

// Count (re-exported from drizzle-orm but we provide a compat alias)
export { count as drizzleCount } from 'drizzle-orm';
`;

fs.writeFileSync(path.join(pkgDir, 'index.js'), indexCode);

// =============================================================================
// postgres.js - Functions imported by @davincios/db-postgres from
//              @davincios/drizzle/postgres
// =============================================================================

const postgresCode = `'use strict';

// Re-export node-postgres driver
export * from 'drizzle-orm/node-postgres';

// ============================================================================
// Payload CMS Postgres-specific Adapter Functions
// ============================================================================

export function columnToCodeConverter(col) {
  return {
    drizzle: col,
    code: JSON.stringify(col)
  };
}

export function countDistinct(db, table, column, condition) {
  if (condition) {
    return db.select({ count: fn.countDistinct(column) }).from(table).where(condition);
  }
  return db.select({ count: fn.countDistinct(column) }).from(table);
}

export async function createDatabase(db, dbName) {
  // Database creation requires raw SQL
  await db.execute(fn.sql(\`CREATE DATABASE \\\\\${dbName}\`));
}

export function createExtensions(db, extensions) {
  return extensions.map(ext => ({ name: ext, installed: true }));
}

export function createJSONQuery(db, table, column, path) {
  return {
    where: (condition) => {
      return db.select().from(table).where(fn.sql(\`\\\${table}.\\\${column}->>\\\${path} = \\\${condition}\`));
    }
  };
}

export function defaultDrizzleSnapshot() {
  return {
    id: 'default',
    schema: {},
    tables: {},
    indexes: {},
    foreignKeys: {}
  };
}

export async function deleteWhere(db, table, condition) {
  const results = await db.delete(table).where(condition).returning();
  return results;
}

export async function dropDatabase(db, dbName) {
  await db.execute(fn.sql(\`DROP DATABASE IF EXISTS \\\${dbName}\`));
}

export async function execute(db, query) {
  return db.execute(query);
}

export async function init(db, config) {
  return db;
}

export async function insert(db, table, data) {
  const [result] = await db.insert(table).values(data).returning();
  return result;
}

export async function requireDrizzleKit() {
  const drizzleKit = await import('drizzle-kit');
  return drizzleKit;
}
`;

fs.writeFileSync(path.join(pkgDir, 'postgres.js'), postgresCode);

console.log('Created @davincios/drizzle with Payload adapter stubs');
console.log('  - index.js: ' + (indexCode.match(/export (async )?function/g) || []).length + ' exports');
console.log('  - postgres.js: ' + (postgresCode.match(/export (async )?function/g) || []).length + ' exports');
