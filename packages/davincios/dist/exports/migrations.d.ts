/**
 * Exports for DaVinciOS migrations
 *
 * This module provides migration utilities that users can import in their migration files.
 *
 * @example
 * ```ts
 * import { localizeStatus } from 'DaVinciOS/migrations'
 *
 * export async function up({ DaVinciOS }) {
 *   await localizeStatus.up({
 *     collectionSlug: 'posts',
 *     DaVinciOS,
 *   })
 * }
 * ```
 */
export { localizeStatus } from '../versions/migrations/localizeStatus/index.js';
//# sourceMappingURL=migrations.d.ts.map
