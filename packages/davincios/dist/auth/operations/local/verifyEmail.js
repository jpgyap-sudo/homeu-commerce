import { APIError } from '../../../errors/index.js';
import { createLocalReq } from '../../../utilities/createLocalReq.js';
import { verifyEmailOperation } from '../verifyEmail.js';
export async function verifyEmailLocal(DaVinciOS, options) {
    const { collection: collectionSlug, token } = options;
    const collection = DaVinciOS.collections[collectionSlug];
    if (!collection) {
        throw new APIError(`The collection with slug ${String(collectionSlug)} can't be found. Verify Email Operation.`);
    }
    return verifyEmailOperation({
        collection,
        req: await createLocalReq(options, DaVinciOS),
        token
    });
}

//# sourceMappingURL=verifyEmail.js.map
