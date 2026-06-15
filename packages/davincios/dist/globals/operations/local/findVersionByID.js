import { APIError } from '../../../errors/index.js';
import { createLocalReq } from '../../../utilities/createLocalReq.js';
import { findVersionByIDOperation } from '../findVersionByID.js';
export async function findGlobalVersionByIDLocal(DaVinciOS, options) {
    const { id, slug: globalSlug, depth, disableErrors = false, overrideAccess = true, populate, select, showHiddenFields } = options;
    const globalConfig = DaVinciOS.globals.config.find((config)=>config.slug === globalSlug);
    if (!globalConfig) {
        throw new APIError(`The global with slug ${String(globalSlug)} can't be found.`);
    }
    return findVersionByIDOperation({
        id,
        depth,
        disableErrors,
        globalConfig,
        overrideAccess,
        populate,
        req: await createLocalReq(options, DaVinciOS),
        select,
        showHiddenFields
    });
}

//# sourceMappingURL=findVersionByID.js.map
