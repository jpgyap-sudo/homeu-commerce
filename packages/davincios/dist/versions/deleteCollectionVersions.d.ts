import type { DaVinciOSRequest } from '../types/index.js';
import { type DaVinciOS } from '../index.js';
type Args = {
    id?: number | string;
    DaVinciOS: DaVinciOS;
    req?: DaVinciOSRequest;
    slug: string;
};
export declare const deleteCollectionVersions: ({ id, slug, DaVinciOS, req }: Args) => Promise<void>;
export {};
//# sourceMappingURL=deleteCollectionVersions.d.ts.map
