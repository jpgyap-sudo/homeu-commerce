'use strict';
/**
 * Generate comprehensive stubs for @davincios/drizzle.
 * 
 * The @davincios/db-postgres adapter imports DaVinciOS-specific functions
 * from @davincios/drizzle (index) and @davincios/drizzle/postgres.
 * These are adapter functions that wrap drizzle-orm with DaVinciOS logic.
 * 
 * Since this workspace does not include the full @davincios/drizzle source, we create
 * minimal stubs that re-export from drizzle-orm where possible and provide
 * thin wrappers for DaVinciOS-specific operations.
 * 
 * IMPORTANT: All CRUD functions are called by the DaVinciOS runtime with a SINGLE
 * config object argument, e.g.:
 *   adapter.findOne({collection: 'users', where: {...}, req, select, ...})
 * 
 * The 'this' context is the database adapter object, which provides:
 *   this.drizzle       - the drizzle-orm database instance
 *   this.tableNameMap  - Map<string, Table> mapping collection slugs to Drizzle tables
 *   this.tables        - object of all Drizzle tables
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
// These are adapter functions from the upstream drizzle integration.
// We re-export from drizzle-orm where the symbols exist, and create thin
// stubs for DaVinciOS-specific operations.
//
// CRITICAL: All CRUD functions receive a SINGLE config object as argument.
// 'this' is the database adapter, providing:
//   this.drizzle       - drizzle DB instance (set during connect)
//   this.tableNameMap  - Map of collection slug -> Drizzle table
//   this.tables        - raw tables object { slug: table }

const indexCode = `'use strict';

import { eq, and, or, sql, count as drizzleCount } from 'drizzle-orm';

// Re-export all from drizzle-orm (provides: count, eq, and, or, sql, etc.)
export * from 'drizzle-orm';

// ============================================================================
// Helper: Resolve Drizzle table from config object
// ============================================================================

/**
 * Resolve a Drizzle table reference from the collection slug.
 * Uses this.tableNameMap (set during schema init) or falls back to this.tables.
 * @param {object} config - The config object with {collection, ...} or {slug, ...} or {global, ...}
 * @returns {{ db: object, table: object }} The drizzle DB instance and table reference
 */
function resolveTable(config) {
  const db = this && this.drizzle;
  if (!db) {
    throw new Error('@davincios/drizzle: this.drizzle not available. DB not connected?');
  }
  const slug = config.collection || config.slug || config.global;
  if (!slug) {
    throw new Error('@davincios/drizzle: no collection/slug/global in config: ' + JSON.stringify(Object.keys(config)));
  }
  // Look up table from tableNameMap (Map<string, Table>) or tables object
  let table = this.tableNameMap instanceof Map
    ? this.tableNameMap.get(slug)
    : this.tables?.[slug];
  if (!table) {
    // Fallback: try finding by key in this.tables
    const tableKey = Object.keys(this.tables || {}).find(k => k === slug || k.endsWith('_' + slug));
    table = tableKey ? this.tables[tableKey] : undefined;
  }
  if (!table) {
    // Table not in schema yet — return null so callers can handle gracefully
    return null;
  }
  return { db, table };
}

// ============================================================================
// Helper: Convert DaVinciOS where format to Drizzle conditions
// ============================================================================

/**
 * Convert a DaVinciOS where clause to Drizzle SQL conditions.
 * DaVinciOS format: { fieldName: { operator: value } }
 * Supports: equals, not_equals, in, not_in, exists, not_exists,
 *           greater_than, greater_than_equal, less_than, less_than_equal,
 *           like, contains, and, or
 * @param {object} where - DaVinciOS where object
 * @param {object} table - Drizzle table reference
 * @returns {object|undefined} Drizzle condition or undefined
 */
function convertWhere(where, table) {
  if (!where || typeof where !== 'object') return undefined;

  // Handle AND conditions
  if (where.and && Array.isArray(where.and)) {
    const conditions = where.and.map(c => convertWhere(c, table)).filter(Boolean);
    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions[0];
    return and(...conditions);
  }

  // Handle OR conditions
  if (where.or && Array.isArray(where.or)) {
    const conditions = where.or.map(c => convertWhere(c, table)).filter(Boolean);
    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions[0];
    return or(...conditions);
  }

  // Regular field conditions: { fieldName: { operator: value } }
  const fieldNames = Object.keys(where).filter(k => k !== 'and' && k !== 'or');
  if (fieldNames.length === 0) return undefined;

  const conditions = fieldNames.map(fieldName => {
    const condition = where[fieldName];
    if (!condition || typeof condition !== 'object') {
      // Simple value match: { fieldName: value }
      const col = table[fieldName];
      return col ? eq(col, condition) : undefined;
    }

    const operators = Object.keys(condition);
    if (operators.length === 0) return undefined;

    return operators.map(op => {
      const value = condition[op];
      const col = table[fieldName];
      if (!col) return undefined;

      switch (op) {
        case 'equals':
          return eq(col, value);
        case 'not_equals':
          return sql\`\${col} != \${value}\`;
        case 'in':
          return sql\`\${col} IN \${value}\`;
        case 'not_in':
          return sql\`\${col} NOT IN \${value}\`;
        case 'exists':
          return sql\`\${col} IS NOT NULL\`;
        case 'not_exists':
          return sql\`\${col} IS NULL\`;
        case 'greater_than':
          return sql\`\${col} > \${value}\`;
        case 'greater_than_equal':
          return sql\`\${col} >= \${value}\`;
        case 'less_than':
          return sql\`\${col} < \${value}\`;
        case 'less_than_equal':
          return sql\`\${col} <= \${value}\`;
        case 'like':
          return sql\`\${col} ILIKE \${'%' + value + '%'}\`;
        case 'contains':
          return sql\`\${col} @> \${JSON.stringify(value)}\`;
        default:
          // Unknown operator - try eq as fallback
          return eq(col, value);
      }
    }).filter(Boolean);
  }).flat().filter(Boolean);

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}

// ============================================================================
// DaVinciOS Drizzle Adapter Functions
// These are imported by @davincios/db-postgres/dist/index.js
// ============================================================================

// --- Transaction functions ---
export async function beginTransaction(db, ctx) {
  // Adapted from DaVinciOS default transaction handling
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

/**
 * create - Called with a single config object.
 * DaVinciOS calls: adapter.create({collection: slug, data: {...}, req, ...})
 * 'this' is the adapter with this.drizzle (DB) and this.tableNameMap.
 */
export async function create(config) {
  const { db, table } = resolveTable.call(this, config);
  const data = config.data || {};
  const [result] = await db.insert(table).values(data).returning();
  return result;
}

export async function createVersion(config) {
  const { db, table } = resolveTable.call(this, config);
  const data = config.data || {};
  const [result] = await db.insert(table).values(data).returning();
  return result;
}

export async function createGlobal(config) {
  const { db, table } = resolveTable.call(this, config);
  const data = config.data || {};
  const [result] = await db.insert(table).values(data).returning();
  return result;
}

export async function createGlobalVersion(config) {
  const { db, table } = resolveTable.call(this, config);
  const data = config.data || {};
  const [result] = await db.insert(table).values(data).returning();
  return result;
}

/**
 * find - Called with a single config object.
 * DaVinciOS calls: adapter.find({collection: slug, where: {...}, limit, page, sort, req, ...})
 */
export function find(config) {
  const { db, table } = resolveTable.call(this, config);
  let q = db.select().from(table);
  const condition = convertWhere(config.where, table);
  if (condition) q = q.where(condition);
  if (config.limit) q = q.limit(config.limit);
  if (config.offset) q = q.offset(config.offset);
  if (config.sort) {
    // Simple sort: 'fieldName' or '-fieldName'
    const dir = config.sort.startsWith('-') ? 'desc' : 'asc';
    const field = config.sort.replace(/^-/, '');
    if (table[field]) {
      q = dir === 'desc' ? q.orderBy(sql\`\${table[field]} DESC\`) : q.orderBy(sql\`\${table[field]} ASC\`);
    }
  }
  return q;
}

/**
 * findOne - Called with a single config object.
 * DaVinciOS calls: adapter.findOne({collection: slug, where: {...}, req, select, ...})
 */
  export function findOne(config) {
    const resolved = resolveTable.call(this, config);
    if (!resolved) {
      const slug = config.collection || config.slug || config.global;
      console.warn('@davincios/drizzle: table not found for slug:', slug, '— returning undefined');
      return undefined;
    }
    const { db, table } = resolved;
    let q = db.select().from(table);
    const condition = convertWhere(config.where, table);
    if (condition) q = q.where(condition);
    return q.limit(1);
  }

export function findDistinct(config) {
  const { db, table } = resolveTable.call(this, config);
  let q = db.selectDistinct().from(table);
  const condition = convertWhere(config.where, table);
  if (condition) q = q.where(condition);
  return q;
}

/**
 * findGlobal - Called with {slug: globalSlug, ...} instead of {collection: ...}
 */
export function findGlobal(config) {
  const { db, table } = resolveTable.call(this, config);
  let q = db.select().from(table);
  const condition = convertWhere(config.where, table);
  if (condition) q = q.where(condition);
  return q.limit(1);
}

export function findGlobalVersions(config) {
  const { db, table } = resolveTable.call(this, config);
  let q = db.select().from(table);
  const condition = convertWhere(config.where, table);
  if (condition) q = q.where(condition);
  return q;
}

export function findVersions(config) {
  const { db, table } = resolveTable.call(this, config);
  let q = db.select().from(table);
  const condition = convertWhere(config.where, table);
  if (condition) q = q.where(condition);
  return q;
}

/**
 * updateOne - Called with {collection: slug, where: {...}, data: {...}, req, ...}
 */
export async function updateOne(config) {
  const { db, table } = resolveTable.call(this, config);
  const data = config.data || {};
  const condition = convertWhere(config.where, table);
  if (condition) {
    const [result] = await db.update(table).set(data).where(condition).returning();
    return result;
  }
  const [result] = await db.update(table).set(data).returning();
  return result;
}

export async function updateMany(config) {
  const { db, table } = resolveTable.call(this, config);
  const data = config.data || {};
  const condition = convertWhere(config.where, table);
  if (condition) {
    const results = await db.update(table).set(data).where(condition).returning();
    return results;
  }
  const results = await db.update(table).set(data).returning();
  return results;
}

export async function updateGlobal(config) {
  const { db, table } = resolveTable.call(this, config);
  const data = config.data || {};
  const condition = convertWhere(config.where, table);
  if (condition) {
    const [result] = await db.update(table).set(data).where(condition).returning();
    return result;
  }
  const [result] = await db.update(table).set(data).returning();
  return result;
}

export async function updateGlobalVersion(config) {
  const { db, table } = resolveTable.call(this, config);
  const data = config.data || {};
  const condition = convertWhere(config.where, table);
  if (condition) {
    const [result] = await db.update(table).set(data).where(condition).returning();
    return result;
  }
  const [result] = await db.update(table).set(data).returning();
  return result;
}

export async function updateVersion(config) {
  const { db, table } = resolveTable.call(this, config);
  const data = config.data || {};
  const condition = convertWhere(config.where, table);
  if (condition) {
    const [result] = await db.update(table).set(data).where(condition).returning();
    return result;
  }
  const [result] = await db.update(table).set(data).returning();
  return result;
}

export async function upsert(config) {
  const { db, table } = resolveTable.call(this, config);
  const data = config.data || {};
  const conflictTarget = config.where ? Object.keys(config.where).map(k => table[k]).filter(Boolean) : undefined;
  if (conflictTarget && conflictTarget.length > 0) {
    const [result] = await db.insert(table).values(data).onConflictDoUpdate({ target: conflictTarget, set: data }).returning();
    return result;
  }
  const [result] = await db.insert(table).values(data).returning();
  return result;
}

/**
 * deleteOne - Called with {collection: slug, where: {...}, req, ...}
 */
export async function deleteOne(config) {
  const { db, table } = resolveTable.call(this, config);
  const condition = convertWhere(config.where, table);
  if (condition) {
    const [result] = await db.delete(table).where(condition).returning();
    return result;
  }
  const [result] = await db.delete(table).returning();
  return result;
}

export async function deleteMany(config) {
  const { db, table } = resolveTable.call(this, config);
  const condition = convertWhere(config.where, table);
  if (condition) {
    const results = await db.delete(table).where(condition).returning();
    return results;
  }
  const results = await db.delete(table).returning();
  return results;
}

export async function deleteVersions(config) {
  const { db, table } = resolveTable.call(this, config);
  const condition = convertWhere(config.where, table);
  if (condition) {
    const results = await db.delete(table).where(condition).returning();
    return results;
  }
  const results = await db.delete(table).returning();
  return results;
}

// --- Count operations ---
export async function count(config) {
  const { db, table } = resolveTable.call(this, config);
  const condition = convertWhere(config.where, table);
  if (condition) {
    const rows = await db.select({ count: drizzleCount() }).from(table).where(condition);
    return Number(rows?.[0]?.count ?? 0);
  }
  const rows = await db.select({ count: drizzleCount() }).from(table);
  return Number(rows?.[0]?.count ?? 0);
}

export async function countVersions(config) {
  const { db, table } = resolveTable.call(this, config);
  const condition = convertWhere(config.where, table);
  if (condition) {
    const rows = await db.select({ count: drizzleCount() }).from(table).where(condition);
    return Number(rows?.[0]?.count ?? 0);
  }
  const rows = await db.select({ count: drizzleCount() }).from(table);
  return Number(rows?.[0]?.count ?? 0);
}

export async function countGlobalVersions(config) {
  const { db, table } = resolveTable.call(this, config);
  const condition = convertWhere(config.where, table);
  if (condition) {
    const rows = await db.select({ count: drizzleCount() }).from(table).where(condition);
    return Number(rows?.[0]?.count ?? 0);
  }
  const rows = await db.select({ count: drizzleCount() }).from(table);
  return Number(rows?.[0]?.count ?? 0);
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

export function queryDrafts(config) {
  const { db, table } = resolveTable.call(this, config);
  return db.select().from(table);
}

export async function updateJobs(config) {
  const { db, table } = resolveTable.call(this, config);
  const data = config.data || {};
  const condition = convertWhere(config.where, table);
  if (condition) {
    const results = await db.update(table).set(data).where(condition).returning();
    return results;
  }
  const results = await db.update(table).set(data).returning();
  return results;
}

// Count (re-exported from drizzle-orm but we provide a compat alias)
export { drizzleCount };
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
// DaVinciOS Postgres-specific Adapter Functions
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
  await db.execute(fn.sql(\`CREATE DATABASE \\\${dbName}\`));
}

export function createExtensions(db, extensions) {
  // When called as adapter.createExtensions(), 'this' is the adapter
  // and 'extensions' is the second arg (undefined when called as method).
  // Read from this.extensions if available, else from the extensions arg.
  const exts = extensions || (this && this.extensions) || [];
  if (Array.isArray(exts)) {
    return exts.map(ext => ({ name: ext, installed: true }));
  }
  // If exts is an object (like {uuidOssp: true}), convert to array
  if (typeof exts === 'object') {
    return Object.keys(exts).map(name => ({ name, installed: true }));
  }
  return [];
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

console.log('Created @davincios/drizzle with fixed DaVinciOS adapter stubs');
console.log('  - index.js: ' + (indexCode.match(/export (async )?function/g) || []).length + ' exports');
console.log('  - CRITICAL FIX: All CRUD ops now accept config objects and use this.drizzle + this.tableNameMap');
