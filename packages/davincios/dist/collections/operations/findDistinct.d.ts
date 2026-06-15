import type { PaginatedDistinctDocs } from '../../database/types.js';
import type { DaVinciOSRequest, PopulateType, Sort, Where } from '../../types/index.js';
import type { Collection } from '../config/types.js';
export type Arguments = {
    collection: Collection;
    depth?: number;
    disableErrors?: boolean;
    field: string;
    limit?: number;
    locale?: string;
    overrideAccess?: boolean;
    page?: number;
    populate?: PopulateType;
    req?: DaVinciOSRequest;
    showHiddenFields?: boolean;
    sort?: Sort;
    trash?: boolean;
    where?: Where;
};
export declare const findDistinctOperation: (incomingArgs: Arguments) => Promise<PaginatedDistinctDocs<Record<string, unknown>>>;
//# sourceMappingURL=findDistinct.d.ts.map
