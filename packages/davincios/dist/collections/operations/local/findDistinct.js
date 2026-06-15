import { APIError, createLocalReq } from '../../../index.js';
import { findDistinctOperation } from '../findDistinct.js';
export async function findDistinct(DaVinciOS, options) {
    const { collection: collectionSlug, depth = 0, disableErrors, field, limit, overrideAccess = true, page, populate, showHiddenFields, sort, trash = false, where } = options;
    const collection = DaVinciOS.collections[collectionSlug];
    if (!collection) {
        throw new APIError(`The collection with slug ${String(collectionSlug)} can't be found. Find Operation.`);
    }
    return findDistinctOperation({
        collection,
        depth,
        disableErrors,
        field,
        limit,
        overrideAccess,
        page,
        populate,
        req: await createLocalReq(options, DaVinciOS),
        showHiddenFields,
        sort,
        trash,
        where
    });
}

//# sourceMappingURL=findDistinct.js.map
