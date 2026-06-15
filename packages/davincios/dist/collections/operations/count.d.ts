import type { CollectionSlug } from '../../index.js';
import type { DaVinciOSRequest, Where } from '../../types/index.js';
import type { Collection } from '../config/types.js';
export type Arguments = {
    collection: Collection;
    disableErrors?: boolean;
    overrideAccess?: boolean;
    req?: DaVinciOSRequest;
    trash?: boolean;
    where?: Where;
};
export declare const countOperation: <TSlug extends CollectionSlug>(incomingArgs: Arguments) => Promise<{
    totalDocs: number;
}>;
//# sourceMappingURL=count.d.ts.map
