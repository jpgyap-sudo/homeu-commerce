import type { DaVinciOS } from '../../../../types/index.js';
/**
 * Migrates main collection documents from _status to per-locale status object
 */
export declare function migrateMainCollectionStatus({ collectionSlug, db, locales, DaVinciOS, sql, versionsTable, }: {
    collectionSlug: string;
    db: any;
    locales: string[];
    DaVinciOS: DaVinciOS;
    sql: any;
    versionsTable: string;
}): Promise<void>;
//# sourceMappingURL=migrateMainCollection.d.ts.map
