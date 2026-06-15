import type { DaVinciOSRequest, Where } from '../../types/index.js';
import type { Collection } from '../config/types.js';
import { type CollectionSlug } from '../../index.js';
export type Arguments = {
    collection: Collection;
    disableErrors?: boolean;
    overrideAccess?: boolean;
    req?: DaVinciOSRequest;
    where?: Where;
};
export declare const countVersionsOperation: <TSlug extends CollectionSlug>(incomingArgs: Arguments) => Promise<{
    totalDocs: number;
}>;
//# sourceMappingURL=countVersions.d.ts.map
