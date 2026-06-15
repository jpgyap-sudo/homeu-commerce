import type { SanitizedCollectionConfig } from '../../../collections/config/types.js';
import type { DaVinciOSRequest } from '../../../types/index.js';
type Args = {
    collection: SanitizedCollectionConfig;
    password: string;
    req: DaVinciOSRequest;
};
export declare const generatePasswordSaltHash: ({ collection, password: passwordToSet, req, }: Args) => Promise<{
    hash: string;
    salt: string;
}>;
export {};
//# sourceMappingURL=generatePasswordSaltHash.d.ts.map
