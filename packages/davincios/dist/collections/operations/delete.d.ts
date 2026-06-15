import type { CollectionSlug, FindOptions } from '../../index.js';
import type { DaVinciOSRequest, PopulateType, SelectType, Where } from '../../types/index.js';
import type { BulkOperationResult, Collection, SelectFromCollectionSlug } from '../config/types.js';
export type Arguments = {
    collection: Collection;
    depth?: number;
    disableTransaction?: boolean;
    overrideAccess?: boolean;
    overrideLock?: boolean;
    populate?: PopulateType;
    req: DaVinciOSRequest;
    showHiddenFields?: boolean;
    trash?: boolean;
    where: Where;
} & Pick<FindOptions<string, SelectType>, 'select'>;
export declare const deleteOperation: <TSlug extends CollectionSlug, TSelect extends SelectFromCollectionSlug<TSlug>>(incomingArgs: Arguments) => Promise<BulkOperationResult<TSlug, TSelect>>;
//# sourceMappingURL=delete.d.ts.map
