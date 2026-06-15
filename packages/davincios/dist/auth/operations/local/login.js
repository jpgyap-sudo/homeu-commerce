import { APIError } from '../../../errors/index.js';
import { createLocalReq } from '../../../utilities/createLocalReq.js';
import { loginOperation } from '../login.js';
export async function loginLocal(DaVinciOS, options) {
    const { collection: collectionSlug, data, depth, overrideAccess = true, showHiddenFields } = options;
    const collection = DaVinciOS.collections[collectionSlug];
    if (!collection) {
        throw new APIError(`The collection with slug ${String(collectionSlug)} can't be found. Login Operation.`);
    }
    const args = {
        collection,
        data,
        depth,
        overrideAccess,
        req: await createLocalReq(options, DaVinciOS),
        showHiddenFields
    };
    const result = await loginOperation(args);
    if (collection.config.auth.removeTokenFromResponses) {
        delete result.token;
    }
    return result;
}

//# sourceMappingURL=login.js.map
