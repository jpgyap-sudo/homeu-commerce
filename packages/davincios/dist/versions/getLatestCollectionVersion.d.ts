import type { SanitizedCollectionConfig, TypeWithID } from '../collections/config/types.js';
import type { FindOneArgs } from '../database/types.js';
import type { DaVinciOS, DaVinciOSRequest } from '../types/index.js';
type Args = {
    config: SanitizedCollectionConfig;
    id: number | string;
    DaVinciOS: DaVinciOS;
    published?: boolean;
    query: FindOneArgs;
    req?: DaVinciOSRequest;
};
export declare const getLatestCollectionVersion: <T extends TypeWithID = any>({ id, config, DaVinciOS, published, query, req, }: Args) => Promise<T | undefined>;
export {};
//# sourceMappingURL=getLatestCollectionVersion.d.ts.map
