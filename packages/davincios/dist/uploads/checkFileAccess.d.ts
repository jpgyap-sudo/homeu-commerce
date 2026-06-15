import type { Collection, TypeWithID } from '../collections/config/types.js';
import type { DaVinciOSRequest } from '../types/index.js';
export declare const checkFileAccess: ({ collection, filename, prefix, req, }: {
    collection: Collection;
    filename: string;
    prefix?: string;
    req: DaVinciOSRequest;
}) => Promise<TypeWithID | undefined>;
//# sourceMappingURL=checkFileAccess.d.ts.map
