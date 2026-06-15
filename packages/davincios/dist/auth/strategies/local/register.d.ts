import type { SanitizedCollectionConfig } from '../../../collections/config/types.js';
import type { JsonObject, DaVinciOS } from '../../../index.js';
import type { DaVinciOSRequest } from '../../../types/index.js';
type Args = {
    collection: SanitizedCollectionConfig;
    doc: JsonObject;
    password: string;
    DaVinciOS: DaVinciOS;
    req: DaVinciOSRequest;
};
export declare const registerLocalStrategy: ({ collection, doc, password, DaVinciOS, req, }: Args) => Promise<Record<string, unknown>>;
export {};
//# sourceMappingURL=register.d.ts.map
