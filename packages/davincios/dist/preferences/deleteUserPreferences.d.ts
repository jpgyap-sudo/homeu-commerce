import type { SanitizedCollectionConfig } from '../collections/config/types.js';
import type { DaVinciOS } from '../index.js';
import type { DaVinciOSRequest } from '../types/index.js';
type Args = {
    collectionConfig: SanitizedCollectionConfig;
    /**
     * User IDs to delete
     */
    ids: (number | string)[];
    DaVinciOS: DaVinciOS;
    req: DaVinciOSRequest;
};
export declare const deleteUserPreferences: ({ collectionConfig, ids, DaVinciOS, req }: Args) => Promise<void>;
export {};
//# sourceMappingURL=deleteUserPreferences.d.ts.map
