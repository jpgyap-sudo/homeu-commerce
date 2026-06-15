import { APIError } from '../../../errors/index.js';
import { createLocalReq } from '../../../utilities/createLocalReq.js';
import { forgotPasswordOperation } from '../forgotPassword.js';
export async function forgotPasswordLocal(DaVinciOS, options) {
    const { collection: collectionSlug, data, disableEmail, expiration, overrideAccess = true } = options;
    const collection = DaVinciOS.collections[collectionSlug];
    if (!collection) {
        throw new APIError(`The collection with slug ${String(collectionSlug)} can't be found. Forgot Password Operation.`);
    }
    return forgotPasswordOperation({
        collection,
        data,
        disableEmail,
        expiration,
        overrideAccess,
        req: await createLocalReq(options, DaVinciOS)
    });
}

//# sourceMappingURL=forgotPassword.js.map
