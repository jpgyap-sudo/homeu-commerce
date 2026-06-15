import type { SanitizedCollectionConfig } from '../collections/config/types.js';
import type { SanitizedGlobalConfig } from '../globals/config/types.js';
import type { DaVinciOS, DaVinciOSRequest } from '../types/index.js';
type Args = {
    collection?: SanitizedCollectionConfig;
    global?: SanitizedGlobalConfig;
    id?: number | string;
    max: number;
    DaVinciOS: DaVinciOS;
    req?: DaVinciOSRequest;
};
export declare const enforceMaxVersions: ({ id, collection, global: globalConfig, max, DaVinciOS, req, }: Args) => Promise<void>;
export {};
//# sourceMappingURL=enforceMaxVersions.d.ts.map
