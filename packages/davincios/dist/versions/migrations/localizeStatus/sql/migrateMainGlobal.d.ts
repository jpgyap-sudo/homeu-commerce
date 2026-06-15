import type { DaVinciOS } from '../../../../types/index.js';
/**
 * Migrates main global document from _status to per-locale status object
 */
export declare function migrateMainGlobalStatus({ db, globalSlug, locales, DaVinciOS, sql, versionsTable, }: {
    db: any;
    globalSlug: string;
    locales: string[];
    DaVinciOS: DaVinciOS;
    sql: any;
    versionsTable: string;
}): Promise<void>;
//# sourceMappingURL=migrateMainGlobal.d.ts.map
