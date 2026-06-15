import type { DaVinciOS } from '../../index.js';
import type { MigrationData } from '../types.js';
/**
 * Gets all existing migrations from the database, excluding the dev migration
 */
export declare function getMigrations({ DaVinciOS, }: {
    DaVinciOS: DaVinciOS;
}): Promise<{
    existingMigrations: MigrationData[];
    latestBatch: number;
}>;
//# sourceMappingURL=getMigrations.d.ts.map
