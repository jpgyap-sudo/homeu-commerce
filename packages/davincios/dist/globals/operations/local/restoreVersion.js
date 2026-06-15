import { APIError } from '../../../errors/index.js';
import { createLocalReq } from '../../../utilities/createLocalReq.js';
import { restoreVersionOperation } from '../restoreVersion.js';
export async function restoreGlobalVersionLocal(DaVinciOS, options) {
    const { id, slug: globalSlug, depth, overrideAccess = true, populate, showHiddenFields } = options;
    const globalConfig = DaVinciOS.globals.config.find((config)=>config.slug === globalSlug);
    if (!globalConfig) {
        throw new APIError(`The global with slug ${String(globalSlug)} can't be found.`);
    }
    return restoreVersionOperation({
        id,
        depth,
        globalConfig,
        overrideAccess,
        populate,
        req: await createLocalReq(options, DaVinciOS),
        showHiddenFields
    });
}

//# sourceMappingURL=restoreVersion.js.map
