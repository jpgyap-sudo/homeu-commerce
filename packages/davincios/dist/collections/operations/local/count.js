import { APIError } from '../../../errors/index.js';
import { createLocalReq } from '../../../utilities/createLocalReq.js';
import { countOperation } from '../count.js';
export async function countLocal(DaVinciOS, options) {
    const { collection: collectionSlug, disableErrors, overrideAccess = true, trash = false, where } = options;
    const collection = DaVinciOS.collections[collectionSlug];
    if (!collection) {
        throw new APIError(`The collection with slug ${String(collectionSlug)} can't be found. Count Operation.`);
    }
    return countOperation({
        collection,
        disableErrors,
        overrideAccess,
        req: await createLocalReq(options, DaVinciOS),
        trash,
        where
    });
}

//# sourceMappingURL=count.js.map
