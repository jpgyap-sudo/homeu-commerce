import { APIError } from '../../../errors/index.js';
import { createLocalReq } from '../../../utilities/createLocalReq.js';
import { restoreVersionOperation } from '../restoreVersion.js';
export async function restoreVersionLocal(DaVinciOS, options) {
    const { id, collection: collectionSlug, depth, overrideAccess = true, populate, select, showHiddenFields } = options;
    const collection = DaVinciOS.collections[collectionSlug];
    if (!collection) {
        throw new APIError(`The collection with slug ${String(collectionSlug)} can't be found. Restore Version Operation.`);
    }
    const args = {
        id,
        collection,
        depth,
        overrideAccess,
        DaVinciOS,
        populate,
        req: await createLocalReq(options, DaVinciOS),
        select,
        showHiddenFields
    };
    return restoreVersionOperation(args);
}

//# sourceMappingURL=restoreVersion.js.map
