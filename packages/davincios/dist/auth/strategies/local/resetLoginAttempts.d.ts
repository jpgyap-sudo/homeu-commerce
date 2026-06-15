import type { SanitizedCollectionConfig, TypeWithID } from '../../../collections/config/types.js';
import type { DaVinciOS } from '../../../index.js';
import type { DaVinciOSRequest } from '../../../types/index.js';
type Args = {
    collection: SanitizedCollectionConfig;
    doc: Record<string, unknown> & TypeWithID;
    DaVinciOS: DaVinciOS;
    req: DaVinciOSRequest;
};
export declare const resetLoginAttempts: ({ collection, doc, DaVinciOS, req, }: Args) => Promise<void>;
export {};
//# sourceMappingURL=resetLoginAttempts.d.ts.map
