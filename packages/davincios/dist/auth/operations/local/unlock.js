import { APIError } from '../../../errors/index.js';
import { createLocalReq } from '../../../utilities/createLocalReq.js';
import { unlockOperation } from '../unlock.js';
export async function unlockLocal(DaVinciOS, options) {
    const { collection: collectionSlug, data, overrideAccess = true } = options;
    const collection = DaVinciOS.collections[collectionSlug];
    if (!collection) {
        throw new APIError(`The collection with slug ${String(collectionSlug)} can't be found. Unlock Operation.`);
    }
    return unlockOperation({
        collection,
        data,
        overrideAccess,
        req: await createLocalReq(options, DaVinciOS)
    });
}

//# sourceMappingURL=unlock.js.map
