/**
 * Stub type definitions for DaVinciOS compatibility.
 *
 * After the CMS framework was removed, all collection and global
 * files still used `satisfies CollectionConfig` / `satisfies GlobalConfig`
 * but the types were exported by `@davincios/cms` (which no longer exists).
 *
 * These stub types provide minimal structural compatibility so that the
 * existing collection definitions compile without modification.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CollectionConfig = Record<string, any>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GlobalConfig = Record<string, any>
