import type { CollectionSlug, FindOptions } from '../../index.js';
import type { DaVinciOSRequest, PopulateType, SelectType, TransformCollectionWithSelect } from '../../types/index.js';
import type { Collection } from '../config/types.js';
export type Arguments<TSlug extends CollectionSlug, TSelect extends SelectType> = {
    collection: Collection;
    depth?: number;
    disableTransaction?: boolean;
    id: number | string;
    overrideAccess?: boolean;
    overrideLock?: boolean;
    populate?: PopulateType;
    req: DaVinciOSRequest;
    showHiddenFields?: boolean;
    trash?: boolean;
} & Pick<FindOptions<TSlug, TSelect>, 'select'>;
export declare const deleteByIDOperation: <TSlug extends CollectionSlug, TSelect extends SelectType>(incomingArgs: Arguments<TSlug, TSelect>) => Promise<TransformCollectionWithSelect<TSlug, TSelect>>;
//# sourceMappingURL=deleteByID.d.ts.map
